# Todo App MySQL Setup

## Prerequisites
1. Make sure you have MySQL installed and running
2. Make sure you have Node.js installed

## Setup Instructions

### 1. Install MySQL (if not already installed)
- **macOS**: `brew install mysql` or download from https://dev.mysql.com/downloads/mysql/
- **Windows**: Download from https://dev.mysql.com/downloads/mysql/
- **Linux**: `sudo apt-get install mysql-server` or equivalent for your distribution

### 2. Start MySQL Service
- **macOS**: `brew services start mysql`
- **Windows**: Start MySQL service from Services
- **Linux**: `sudo systemctl start mysql`

### 3. Create MySQL User (Optional but recommended)
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create a new user for the todo app (optional)
CREATE USER 'todouser'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON todo_app.* TO 'todouser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Update Database Configuration
Edit the `server.js` file and update the database configuration:

```javascript
const dbConfig = {
    host: 'localhost',
    user: 'root', // or 'todouser' if you created a new user
    password: 'your_mysql_password', // Your MySQL password
    database: 'todo_app'
};
```

### 5. Install Dependencies
Run the following command in the todo directory:
```bash
npm install
```

### 6. Start the Application
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

