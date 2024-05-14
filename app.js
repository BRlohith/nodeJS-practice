const express = require('express')
const path = require('path')
const bcrypt = require('bcrypt')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

app.post('/register/', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  let hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `
    SELECT * FROM 
    user 
    WHERE
    username = "${username}";`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    const createUserQuery = `
        INSERT INTO user(username,name,password,gender,location)
        VALUES(
            "${username}",
            "${name}",
            "${password}",
            "${gender}",
            "${location}"
        )
        ;`
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      await db.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
    SELECT * FROM 
    user 
    WHERE
    username = "${username}";`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatch === true) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.put('/change-password/', async (request, response) => {
  const {username, oldpassword, newPassword} = request.body
  const checkForUserQuery = `
    SELECT * FROM 
    user 
    WHERE
    username = "${username}";`
  const dbUser = await db.get(checkForUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('User not registerd')
  } else {
    const isValidMatch = await bcrypt.compare(oldpassword, dbUser.password)
    if (isValidMatch === true) {
      if (newPassword.length < 5) {
        response.status(400)
        response.send('Password is too short')
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        const updatePasswordQuery = `
        UPDATE user SET
        password = "${encryptedPassword}"
        WHERE
        username = "${username}";`
        await db.run(updatePasswordQuery)
        response.status(200)
        response.send('password Updated')
      }
    } else {
      response.status(200)
      response.send('Invalid current password')
    }
  }
})

module.exports = app
