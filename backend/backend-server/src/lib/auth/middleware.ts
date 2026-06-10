import type {RequestHandler} from "express"
import { jwtSecret } from "../env/index.ts";
import { jwtVerify } from "jose";

//block requests without the authorization
export const authorize: RequestHandler = async (req, res, next) => {
  const authHead: string = req.cookies.inscriberCookie;
  if (!authHead) {
    return res.sendStatus(401);
  }

  const [ _, token ] = authHead?.split(" ");

  const secret = new TextEncoder().encode(jwtSecret);

  try {
    await jwtVerify(token, secret);
    res.locals.authorized = true;

  } catch (e) {
    return res.sendStatus(401);

  }

  next();
}
