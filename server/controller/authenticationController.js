import request from 'request'
import moment from 'moment'
import User from '../model/user'
import jwt from 'jsonwebtoken'
import config from '../config/secret'

export function SignUp(req, res) {
  let { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your email and password.',
    })
  }
  email = email.toLowerCase()
  const user = new User({
    email,
    password,
  })
  user.save((error) => {
    if (error) {
      return  res.status(403).json({
        success: false,
        error,
      })
    }
    const token = jwt.sign({ email: user.email }, config.JwtSecret, {
      expiresIn: 5184000, // 60 days in seconds
    })
    return res.status(201).json({
      success: true,
      user,
      access_token: `JWT ${token}`,
    })
  })
}

export function SignIn(req, res) {
  let { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your email and password.',
    })
  }
  email = email.toLowerCase()
  User.findOne({ email }, (error, user) => {
    // if error finding an user
    if (error) {
      return res.status(403).json({
        success: false,
        error,
      })
    }
    // if no such user
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. User not found.',
      })
    }
    // Check if password matches
    user.authenticate(password, (err2, isMatch) => {
      if (isMatch) {
      // Create token if the password matched and no error was thrown
        const token = jwt.sign({ email: user.email }, config.JwtSecret, {
          expiresIn: 5184000, // 60 days in seconds
        })
        return res.status(200).json({
          success: true,
          user,
          access_token: `JWT ${token}`,
        })
      }
      return  res.status(401).json({
        success: false,
        error: 'Authentication failed. Passwords does not match.',
      })
    })
  })
}

export function Verify(req, res) {
  switch (req.query.method) {
    case 'text':
      if (!req.query.phone || req.query.phone.length != 11){
        return res.status(400).json({
          success: false,
          error: 'Missing parameter:  11-digit phone number.',
        })
      }
      const code = randomCode(4)
      const options = sendTextOption(req.query.phone, code)
      request(options, function (error, response, body) {
        if (error) {
          return res.status(500).json({
            success: false,
            error
          })
        }
        const parsedBody = JSON.parse(body)
        const status =  parsedBody.messages[0].status
        if( status === '0') {
          const expiresInFive = moment().add(5, 'm')
          const query = {email: req.user.email}
          const updates = {
            'phone.number': req.query.phone,
            'phone.verification.code': code,
            'phone.verification.expire': expiresInFive,
          }
          const options = {
            new: true,
            runValidators: true,
          }
          User.findOneAndUpdate(query, updates, options, function(err, user){
            if(err){
              return res.status(403).json({
                success: false,
                error: err,
              })
            }
            return res.status(200).json({
              success: true,
              user
            })
          })
        } else {
          return res.status(500).json({
            success: false,
            error: `Message delievery failed, SMS API response status code: ${status}. Please check https://docs.nexmo.com/messaging/sms-api/api-reference .`,
          })
        }
      })
      break
    case 'email':
      console.log('method: email')
      break
    default:
      return res.status(400).json({
        success: false,
        error: 'Missing parameter METHOD(email or text).'
      })
  }
}

export function VerifyCheck(req, res) {
  switch (req.query.method) {
    case 'text':
      if (!req.query.code || req.query.code.length != 4){
        return res.status(400).json({
          success: false,
          error: 'Missing parameter: 4-digit verfication code.',
        })
      }
      const query = {email: req.user.email}
      User.findOne(query, function(err, user){
        if(err){
          return res.status(403).json({
            success: false,
            error: err,
          })
        }
        if (req.query.code != user.phone.verification.code) { // code is incorrect
          return res.status(400).json({
            success: false,
            error: 'The code is incorrect.',
          })
        } else if (moment().isAfter(user.phone.verification.expire)){ // code is expired
          return res.status(400).json({
            success: false,
            error: 'The code is expired.',
          })
        } else {
          const updates = {
            'phone.verification.verified': true,
            $unset: {
              'phone.verification.code': '',
              'phone.verification.expire': '',
            }
          }
          user.update(updates, function (err, user){
            if (err) {
              return res.status(500).json({
                success: false,
                error: err,
              })
            } else {
              return res.status(200).json({
                success: true,
                msg: 'Phone number successfully verified!'
              })
            }
          })
        }
      })
      break
    case 'email':

      break
    default:
      return res.status(400).json({
        success: false,
        error: 'Missing parameter METHOD(email or text).'
      })
  }
}

export function Forgot(req, res){
  let { email } = req.body
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your email.',
    })
  }
  email = email.toLowerCase()
  User.findOne({ email }, (error, user) => {
    // if error finding an user
    if (error) {
      return res.status(403).json({
        success: false,
        error,
      })
    }
    // if no such user
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. User not found.',
      })
    }
    const resetPasswordToken = randomCode(15)
    const resetPasswordExpire = moment().add(2, 'h') // reset link exipres in 2 hours
    user.resetPasswordToken = resetPasswordToken
    user.resetPasswordExpire = resetPasswordExpire
    user.save((error) => {
      if (error) {
        return  res.status(403).json({
          success: false,
          error,
        })
      }
      return res.status(200).json({
        success: true,
        resetPasswordToken,
      })
    })
  })
}

// Utility functions

function sendTextOption(phone, code){
  const message = `SFU Commute Verification Code: ${code}.`
  const options = {
    method: 'GET',
    url: 'https://rest.nexmo.com/sms/json',
    qs: {
      api_key: config.nexmoApiKey,
      api_secret: config.nexmoApiSecret,
      to: phone,
      from: config.nexmoFromNumber,
      text: message
    }
  }
  return options
}

function randomCode(digits){
  const code = Math.floor(Math.pow(10, digits+1) + Math.random() * 9*Math.pow(10, digits+1)).toString().substring(1,digits+1)
  return code
}