<?php
declare(strict_types=1);

/*
 * Copy this file to config.php in the same folder and replace every value.
 * Use the database credentials shown in Hostinger hPanel → Databases.
 * Generate setup_token with at least 48 random characters.
 * Never commit api/config.php to a public repository.
 */
return [
    'db_host' => 'localhost',
    'db_name' => 'YOUR_HOSTINGER_DATABASE_NAME',
    'db_user' => 'YOUR_HOSTINGER_DATABASE_USER',
    'db_password' => 'CHANGE_THIS_DATABASE_PASSWORD',
    'setup_token' => 'REPLACE_WITH_A_LONG_RANDOM_TOKEN_AT_LEAST_48_CHARACTERS',
    'session_name' => 'rock_admin_session',
];
