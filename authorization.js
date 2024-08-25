import { auth } from 'express-oauth2-jwt-bearer';
import dotenv from "dotenv";

dotenv.config();
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL;

const authorize = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: AUTH0_ISSUER_BASE_URL,
  algorithms: ['RS256'],
});

export default authorize;
