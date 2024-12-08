import mysql from 'mysql';
import { connection } from './index.mjs'; // Changed to import statement

// Create a Room
export const createRoom = async (eventObj) => {
  const { room_name, created_by_openid, user_name, avatar_url } = eventObj;
  const createRoomQuery = 'INSERT INTO rooms (room_name, created_by_openid) VALUES (?, ?)';
  const createUserQuery = 'INSERT INTO users (username, open_id, avatar_url, role, room_id) VALUES (?, ?, ?, 1, ?)';
  const createRoundQuery = 'INSERT INTO rounds (room_id, round_number) VALUES (?, 1)';

  return new Promise((resolve, reject) => {
    connection.beginTransaction(err => {
      if (err) return reject(err);

      connection.query(createRoomQuery, [room_name, created_by_openid], (err, roomResult) => {
        if (err) return connection.rollback(() => reject(err));

        const room_id = roomResult.insertId;
        connection.query(createUserQuery, [user_name, created_by_openid, avatar_url, room_id], (err, userResult) => {
          if (err) return connection.rollback(() => reject(err));

          connection.query(createRoundQuery, [room_id], (err) => {
            if (err) return connection.rollback(() => reject(err));

            connection.commit(err => {
              if (err) return connection.rollback(() => reject(err));
              resolve({ user_id: userResult.insertId });
            });
          });
        });
      });
    });
  });
};

// Join a Room
export const joinRoom = async (eventObj) => {
  const { user_name, avatar_url, role, room_id, open_id } = eventObj;
  const query = 'INSERT INTO users (username, avatar_url, role, room_id, open_id) VALUES (?, ?, ?, ?, ?)';

  return new Promise((resolve, reject) => {
    connection.query(query, [user_name, avatar_url, role, room_id, open_id], (err, result) => {
      if (err) return reject(err);
      resolve({ user_id: result.insertId });
    });
  });
};

// Create a Round
export const createRound = async (eventObj) => {
  const { room_id } = eventObj;
  const updateLatestRoundQuery = `
    UPDATE rounds 
    SET status = 1 
    WHERE round_id = (
      SELECT latest_round_id FROM (
        SELECT round_id AS latest_round_id 
        FROM rounds 
        WHERE room_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      ) AS subquery
    )
  `;
  const insertNewRoundQuery = `
    INSERT INTO rounds (room_id, round_number) 
    VALUES (?, (SELECT COALESCE(MAX(round_number), 0) + 1 FROM (SELECT * FROM rounds) AS subquery WHERE room_id = ?))
  `;

  return new Promise((resolve, reject) => {
    connection.beginTransaction(err => {
      if (err) return reject(err);

      // Mark the latest round as revealed
      connection.query(updateLatestRoundQuery, [room_id], (err) => {
        if (err) return connection.rollback(() => reject(err));

        // Insert a new round
        connection.query(insertNewRoundQuery, [room_id, room_id], (err) => {
          if (err) return connection.rollback(() => reject(err));

          connection.commit(err => {
            if (err) return connection.rollback(() => reject(err));
            resolve({});
          });
        });
      });
    });
  });
};

// Vote
export const vote = async (eventObj) => {
  const { user_id, vote_value } = eventObj;
  const query = `
    INSERT INTO votes (user_id, round_id, vote_value) 
    VALUES (?, (SELECT round_id FROM rounds WHERE room_id = (SELECT room_id FROM users WHERE user_id = ?) ORDER BY created_at DESC LIMIT 1), ?) 
    ON DUPLICATE KEY UPDATE vote_value = ?`;

  return new Promise((resolve, reject) => {
    connection.query(query, [user_id, user_id, vote_value, vote_value], (err) => {
      if (err) return reject(err);
      resolve({});
    });
  });
};

// Reveal Votes
export const revealVotes = async (eventObj) => {
  const { round_id } = eventObj;
  const query = 'UPDATE rounds SET status = 1 WHERE round_id = ?';

  return new Promise((resolve, reject) => {
    connection.query(query, [round_id], (err) => {
      if (err) return reject(err);
      resolve({});
    });
  });
};

// Fetch Room Status
export const fetchRoomStatus = async (eventObj) => {
  const { room_id } = eventObj;
  const roomQuery = 'SELECT * FROM rooms WHERE room_id = ?';
  const roundQuery = 'SELECT * FROM rounds WHERE room_id = ? ORDER BY created_at DESC LIMIT 1';
  const votesQuery = `
    SELECT u.user_id, u.username, u.avatar_url, u.role, COALESCE(v.vote_value, -1) AS vote_value 
    FROM users u 
    LEFT JOIN votes v ON u.user_id = v.user_id AND v.round_id = ?
    WHERE u.room_id = ?
  `;

  return new Promise((resolve, reject) => {
    connection.query(roomQuery, [room_id], (err, roomResults) => {
      if (err) return reject(err);
      if (roomResults.length === 0) return reject(new Error('Room not found'));

      const room = roomResults[0];
      connection.query(roundQuery, [room_id], (err, roundResults) => {
        if (err) return reject(err);
        if (roundResults.length === 0) return reject(new Error('No rounds found'));

        const round = roundResults[0];
        connection.query(votesQuery, [round.round_id, room_id], (err, userResults) => {
          if (err) return reject(err);

          const users = userResults.map(user => ({
            role: user.role,
            user_id: user.user_id,
            user_name: user.username,
            avatar_url: user.avatar_url,
            vote: user.vote_value
          }));

          resolve({
            room: {
              room_id: room.room_id,
              room_name: room.room_name,
              current_round_name: `Round ${round.round_number}`,
              current_round_id: round.round_id,
              current_round_status: round.status
            },
            users
          });
        });
      });
    });
  });
};

// Edit Profile
export const editProfile = async (eventObj) => {
  const { user_id, role, user_name, avatar_url } = eventObj;
  const updateFields = [];
  const updateValues = [];

  if (role !== undefined) {
    updateFields.push('role = ?');
    updateValues.push(role);
  }
  if (user_name !== undefined) {
    updateFields.push('username = ?');
    updateValues.push(user_name);
  }
  if (avatar_url !== undefined) {
    updateFields.push('avatar_url = ?');
    updateValues.push(avatar_url);
  }

  if (updateFields.length === 0) {
    return Promise.reject(new Error('No fields to update'));
  }

  const updateProfileQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`;
  updateValues.push(user_id);

  return new Promise((resolve, reject) => {
    connection.beginTransaction(err => {
      if (err) return reject(err);

      connection.query(updateProfileQuery, updateValues, (err) => {
        if (err) return connection.rollback(() => reject(err));

        if (role !== undefined) {
          const deleteVotesQuery = 'DELETE FROM votes WHERE user_id = ?';
          connection.query(deleteVotesQuery, [user_id], (err) => {
            if (err) return connection.rollback(() => reject(err));

            connection.commit(err => {
              if (err) return connection.rollback(() => reject(err));
              resolve({});
            });
          });
        } else {
          connection.commit(err => {
            if (err) return connection.rollback(() => reject(err));
            resolve({});
          });
        }
      });
    });
  });
};
