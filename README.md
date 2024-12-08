# This Node.js project is the backend for an agile planning poker app. All http requests are received by the `index.mjs` file. `apiHandler.js` is the handler for all requests.

## All created tables:
```sql
CREATE TABLE `rooms` (
  `room_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `room_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by_openid` varchar(255) NOT NULL,
  PRIMARY KEY (`room_id`),
  Unique KEY `uni_openid_tablename`(`created_by_openid`,`room_name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
;

CREATE TABLE `rounds` (
  `round_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `status` int NOT NULL DEFAULT '0' COMMENT '0 open, 1 revealed',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `room_id` bigint NOT NULL,
  `round_number` int NOT NULL,
  PRIMARY KEY (`round_id`),
  UNIQUE KEY `uni_room_round` (`room_id`,`round_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
;

CREATE TABLE `users` (
  `user_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `open_id` varchar(255) NOT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `role` int NOT NULL,
  `room_id` bigint NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uni_room_openid` (`room_id`,`open_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
;

CREATE TABLE `votes` (
  `vote_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `round_id` bigint NOT NULL,
  `vote_value` int NOT NULL DEFAULT '-1' COMMENT '-1 means not voted, -2 means skipped, 0-100 means voted',
  PRIMARY KEY (`vote_id`),
  UNIQUE KEY `uni_user_round` (`user_id`,`round_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
;
```
