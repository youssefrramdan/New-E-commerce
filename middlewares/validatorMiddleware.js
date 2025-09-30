/* eslint-disable import/no-extraneous-dependencies */
import { matchedData, validationResult } from "express-validator";

// 2- middle ware => catch errors from rules if exist
const validatorMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  // @desc finds the validation errors in this request and wraps them in an object with handy functions
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  req.validData = matchedData(req);
  next();
};
export default validatorMiddleware;
