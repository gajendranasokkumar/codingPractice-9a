const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')

const dbPath = path.join(__dirname, 'userData.db')
let db = null

app.use(express.json())

const initDbandStart = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server is Started!!')
    })
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}

initDbandStart()

app.post('/register/', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  if (password.length < 5) {
    response.status = 400
    response.send('Password is too short')
    return
  }
  const hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`
    const dbResponse = await db.run(createUserQuery)
    response.status = 200
    response.send('User created successfully')
    return
  } else {
    response.status = 400
    response.send('User already exists')
    return
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body

  if (newPassword.length < 5) {
    response.status(400).send('Password is too short')
  }

  const selectUserQuery = `SELECT * FROM user WHERE username = ?`
  const dbUser = await db.get(selectUserQuery, username)

  if (!dbUser) {
    response.status(400).send('Invalid current password')
  }

  const isPasswordCorrect = await bcrypt.compare(oldPassword, dbUser.password)

  if (!isPasswordCorrect) {
    response.status(400).send('Invalid current password')
    return
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10)
  const updatePasswordQuery = `UPDATE user SET password = ? WHERE username = ?`
  await db.run(updatePasswordQuery, hashedNewPassword, username)

  response.status(200).send('Password updated')
})

module.exports = app
