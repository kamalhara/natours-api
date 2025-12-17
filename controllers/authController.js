const User = require('../model/userModel');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const sendEmail = require('./../utils/email');
const crypto = require('crypto');

const signinToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const createSendToken = (user, statusCode, res) => {
  const token = signinToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: true,
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      role: req.body.role,
    });
    createSendToken(newUser, 201, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    //1. Check if email and password exist
    if (!email || !password) {
      const err = new Error('Please provide us email and password');
      err.status = 'fail';
      err.statusCode = 400;

      return next(err);
    }

    //2. Check if user exist
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      const err = new Error('Incorrect email or password');
      err.statusCode = 401;
      err.status = 'fail';
      return next(err);
    }

    //3. Check if password is correct
    const correct = await user.comparePassword(password, user.password);

    if (!correct) {
      const err = new Error('Incorrect email or password');
      err.statusCode = 401;
      err.status = 'fail';
      return next(err);
    }

    //4. If everything is okay send token to client
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    //1.Getting token and checking if its there
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    console.log(token);

    if (!token) {
      const err = new Error(
        'You are not logged in. Please login to get access!',
      );

      err.status = 'fail';
      err.statusCode = 401;

      return next(err);
    }
    //2.Verification of token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log(decoded);

    //3.Checking if user exist
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      const err = new Error('The user belong to this token no longer exists !');

      err.status = 'fail';
      err.statusCode = 401;

      return next(err);
    }

    req.user = currentUser;

    next();
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const err = new Error(
        'You dont have a permission to perform this action',
      );
      err.statusCode = 403;
      err.status = 'fail';
      return next(err);
    }
    next();
  };
};

exports.forgotPassword = async (req, res, next) => {
  try {
    //1.Get user based POSTed email
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      const err = new Error('There is no user with this email');
      err.statusCode = 403;
      err.status = 'fail';
      return next(err);
    }

    //2.Generate random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    //3.send it user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with a new password and passwordConfirm to ${resetURL}.\n If you didn't forgot your passeord please ignore this email! `;

    try {
      console.log('before sending email');
      await sendEmail({
        email: user.email,
        subject: 'Your password rest token(valid for)',
        message,
      });
      console.log('after sendind email');

      res.status(200).json({
        status: 'success',
        message: 'Token has been sent to your email',
      });
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      const err = new Error(
        'There was an error in sending email. Please try again later',
      );
      err.statusCode = 500;
      err.status = 'fail';
      return next(err);
    }
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    //1.Get user based on token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    //2.If token has not expired and there is a user, set new password
    if (!user) {
      const err = new Error('Token is invalid or has expired');
      err.statusCode = 500;
      err.status = 'fail';
      return next(err);
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    //3.Update changePAsswordAt property for user
    //4.Log the user in and send JWT
    createSendToken(user, 201, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.updatePassword = async (req, res, next) => {
  //1.Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  //2.Check if POSTed current password is correct
  console.log('req.user:', req.user);
  console.log('Password from body:', req.body.passwordCurrent);
  console.log('Password from DB:', user.password);
  if (!(await user.comparePassword(req.body.passwordCurrent, user.password))) {
    const err = new Error('Incorrect Password');
    err.statusCode = 500;
    err.status = 'fail';
    return next(err);
  }

  //3.If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4.Log user in, send JWT
  createSendToken(user, 201, res);
};
