const express = require("express");
const passport = require('passport');
const router = express.Router();
const User = require("../models/User");

// Bcrypt to encrypt passwords
const bcrypt = require("bcrypt");
const bcryptSalt = 10;

const transporter = require('../mail/transporter');

require('dotenv').config();

router.get("/login", (req, res, next) => {
  res.render("auth/login", { "message": req.flash("error") });
});

router.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/auth/login",
  failureFlash: true,
  passReqToCallback: true
}));

router.get("/signup", (req, res, next) => {
  res.render("auth/signup");
});

router.post("/signup", (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;
  const email = req.body.email;

  const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let confirmationCode = '';
  for (let i = 0; i < 25; i++) {
    confirmationCode += characters[Math.floor(Math.random() * characters.length)];
  }

  if (username === "" || password === "") {
    res.render("auth/signup", { message: "Indicate username and password" });
    return;
  }

  User.findOne({ username }, "username", (err, user) => {
    if (user !== null) {
      res.render("auth/signup", { message: "The username already exists" });
      return;
    }

    const salt = bcrypt.genSaltSync(bcryptSalt);
    const hashPass = bcrypt.hashSync(password, salt);

    const newUser = new User({
      username,
      password: hashPass,
      email,
      confirmationCode
    });

    let autoEmailer = {
      senderEmail: `${process.env.EMAIL_USER}`,
      subject: "Account Confirmation Message - Nodemailer Lab",
      message: `Please visit the following link to confirm: <a href="http://localhost:3000/auth/confirm/${confirmationCode}"> Confirm <a>`
    }

    transporter.sendMail({
      from: `"My Awesome Nodemailer-Lab 👻" <${process.env.EMAIL_USER}>`,
      to: 'ferp@protonmail.ch',
      subject: autoEmailer.subject,
      text: autoEmailer.message,
      html: `<p>${autoEmailer.message}<p>
      `,
    })
      .then(() => console.log('message' + "\n" + { autoEmailer }))
      .catch(err => console.log(err));

    newUser.save()
      .then(() => {
        console.log({ autoEmailer });
        res.render("auth/message", autoEmailer);
      })
      .catch(err => {
        res.render("auth/signup", { message: "Something went wrong" });
      })
  });
});

router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

router.get("/confirm/:confirmCode", (req, res) => {
  User.find({ confirmationCode: req.params.confirmCode })
    .then((user1) => {
      if (user1 !== null) {
        // console.log(confirmationCode);
        // console.log(req.params.confirmCode);
        let status = "Active"
        console.log({ user1 });
        console.log(user1[0]._id);
        User.findByIdAndUpdate(user1[0]._id, { status })
          .then((user2) => {
            console.log("User Status Updated: " + user2);
            res.render('auth/confirm', { message: "Confirmation Successful" });
          })
          .catch((err) => {
            res.render('auth/confirm', {
              message: `Confirmation FAILED. Please check that everything is in order @ the nodemailer. 
        Error: ${err}`
            });
            return err
          })
      }
    })
    .catch((err) => {
      return err
    })
})


router.get('/show-profile', (req, res) => {
  console.log('TEST');
  console.log(req.user);
  res.render('auth/profile', req.user);
  // User.findById(req.user);
})

module.exports = router;