# GameAtlas

There are two ways to run GameAtlas. **Docker is the easiest**: it needs no Node.js or MySQL on your computer and no
setup steps.

# Run with Docker (easiest)

## What you need

- **Git**: <https://git-scm.com>
- **Docker Desktop**: <https://www.docker.com/products/docker-desktop/>. Start it once after installing and wait until
  it says the engine is running.

## 1. Download

```bash
git clone https://github.com/david-snaxx/ist44w-gameatlas.git
```

```bash
cd ist44w-gameatlas
```

## 2. Start

```bash
docker compose up --build
```

The first start downloads and builds everything, which takes a few minutes. It's ready when the terminal says
`GameAtlas API running`.

Open <http://localhost:3000>, click **Sign up** and make an account. Your first project comes filled with examples.

## Stopping and starting again

- **Stop:** press `Ctrl+C` in that terminal.
- **Start again:** run `docker compose up --build` again from the project folder. Your accounts and data are kept.
- **Start over with an empty database:** `docker compose down -v` deletes all the data, then start again.

## On a server other people can reach

Skip this on your own computer. On a server, run this once in the project folder before the first start. It makes a
random secret that signs login cookies and keeps it in a `.env` file on that server only (it's never committed):

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env
```

Then start it as above. Without this, the server uses a secret that's visible in this repository, so anyone could fake
a login.

## If something goes wrong

- **`docker` isn't recognized, or it can't connect to the Docker engine:** start Docker Desktop and wait until it says
  the engine is running.
- **`port is already allocated`:** something else is using port 3000, such as GameAtlas running without Docker. Stop
  it, then try again.

# Run without Docker

## What you need

- **Git**: <https://git-scm.com>
- **Node.js 24 or newer**: <https://nodejs.org>. Check with `node -v`.
- **MySQL 8.4** (Community Server): <https://dev.mysql.com/downloads/mysql/>. Remember the root password you choose
  during setup.

## 1. Download

```bash
git clone https://github.com/david-snaxx/ist44w-gameatlas.git
```

## 2. Navigate to project
```bash
cd ist44w-gameatlas
```

## 3. Install

Install npm packages for the backend
```bash
cd backend
npm install
```
Install npm packages for the frontend
```bash
cd ../frontend
npm install
```
Navigate back to the project root
```bash
cd ..
```

## 4. Set up the database

From the project folder, create the database and its tables. Both commands ask for the MySQL root password you chose
when installing MySQL:

```bash
mysql -u root -p -e "source backend/sql/init.sql"
```

```bash
mysql -u root -p gameatlas -e "source backend/sql/tables.sql"
```

On Windows, MySQL's installer doesn't add `mysql` to the PATH, so in PowerShell use these two instead:

```powershell
& "C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe" -u root -p -e "source backend/sql/init.sql"
```

```powershell
& "C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe" -u root -p gameatlas -e "source backend/sql/tables.sql"
```

There's no settings file to fill in: the app logs in to MySQL with a local-only password that `init.sql` already set
up. (To change a setting, such as the port, copy `backend/.env.example` to `backend/.env` and edit it there.)

## 5. Run

Open two terminals in the project folder.
Terminal 1 starts the backend:
```bash
cd backend
npm run dev
```

Terminal 2 starts the frontend:
```bash
cd frontend
npm run dev
```

The frontend should be live at <http://localhost:5173>

The backend can be verified running at <http://localhost:3000/api/health>

Keep both terminals open while you use the app. 

Press `Ctrl+C` in each to stop.

## If something goes wrong

- **Check the server:** <http://localhost:3000/api/health> should say `"database":"ok"`. If it says `unreachable`,
  check that MySQL is running and that both commands in step 4 finished without an error. The server's terminal shows
  the reason.
- **`Unknown file extension ".ts"`** when starting the server means Node is older than 24. Check with `node -v`.
- **"Couldn't reach the server"** in the app means the server in terminal 1 isn't running.
