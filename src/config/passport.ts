import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User";

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

export const initializePassport = (): void => {
  // JWT Strategy
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET as string,
      },
      async (payload: JwtPayload, done) => {
        try {
          const user = await User.findById(payload.id);
          if (user) {
            return done(null, user as any);
          }
          return done(null, false);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  // Google Strategy
  const googleStrategy = new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/api/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // First try to find user by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // If not found by googleId, check if user exists with this email
          const existingUser = await User.findOne({
            email: profile.emails?.[0].value,
          });

          if (existingUser) {
            // If user exists, update their googleId
            existingUser.googleId = profile.id;
            await existingUser.save();
            user = existingUser;
          } else {
            // If no user exists, create new user
            user = await User.create({
              name: profile.displayName,
              email: profile.emails?.[0].value,
              googleId: profile.id,
            });
          }
        }

        return done(null, user as any);
      } catch (error) {
        return done(error, false);
      }
    }
  );

  passport.use("google", googleStrategy as any);
};
