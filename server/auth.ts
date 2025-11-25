import * as client from "openid-client";
import { Strategy as OpenIDStrategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback } from "passport-google-oauth20";
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from "passport-facebook";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Replit-specific configuration (optional for non-Replit deployments)
if (!process.env.REPLIT_DOMAINS && process.env.NODE_ENV === 'production') {
  // Only throw in production if using Replit-specific features
  // For other platforms, this can be ignored
  console.warn("REPLIT_DOMAINS not set - Replit OAuth features will be disabled");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(userData: any, provider: string) {
  const user = {
    id: `${provider}_${userData.id || userData.sub}`,
    email: userData.email,
    firstName: userData.first_name || userData.given_name || userData.name?.split(' ')[0],
    lastName: userData.last_name || userData.family_name || userData.name?.split(' ').slice(1).join(' '),
    profileImageUrl: userData.profile_image_url || userData.picture,
  };
  
  await storage.upsertUser(user);
  return user;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Replit OpenID Connect Strategy
  const config = await getOidcConfig();
  
  const replitVerify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    const dbUser = await upsertUser(tokens.claims(), 'replit');
    (user as any).dbUser = dbUser;
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new OpenIDStrategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/auth/replit/callback`,
      },
      replitVerify,
    );
    passport.use(strategy);
  }

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const callbackURL = domain.includes('localhost') 
      ? "http://localhost:5000/api/auth/youtube/callback"
      : `https://${domain}/api/auth/youtube/callback`;
      
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: callbackURL
    }, async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: VerifyCallback) => {
      try {
        const dbUser = await upsertUser({
          id: profile.id,
          email: profile.emails?.[0]?.value,
          given_name: profile.name?.givenName,
          family_name: profile.name?.familyName,
          picture: profile.photos?.[0]?.value
        }, 'google');
        
        const user = {
          dbUser,
          access_token: accessToken,
          refresh_token: refreshToken,
          provider: 'google'
        };
        
        done(null, user);
      } catch (error) {
        done(error);
      }
    }));
  }

  // Facebook OAuth Strategy  
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ['id', 'emails', 'name', 'picture']
    }, async (accessToken: string, refreshToken: string, profile: FacebookProfile, done: VerifyCallback) => {
      try {
        const dbUser = await upsertUser({
          id: profile.id,
          email: profile.emails?.[0]?.value,
          given_name: profile.name?.givenName,
          family_name: profile.name?.familyName,
          picture: profile.photos?.[0]?.value
        }, 'facebook');
        
        const user = {
          dbUser,
          access_token: accessToken,
          refresh_token: refreshToken,
          provider: 'facebook'
        };
        
        done(null, user);
      } catch (error) {
        done(error);
      }
    }));
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Replit auth routes
  app.get("/api/auth/replit", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/auth/replit/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/auth/login",
    })(req, res, next);
  });

  // Google auth routes
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // YouTube OAuth route with YouTube API scopes
  app.get("/api/auth/youtube", 
    passport.authenticate("google", { 
      scope: [
        "profile", 
        "email", 
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube.force-ssl"
      ] 
    })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/api/auth/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // YouTube OAuth callback
  app.get("/api/auth/youtube/callback",
    passport.authenticate("google", { failureRedirect: "/admin/youtube-setup?error=oauth_failed" }),
    (req, res) => {
      // Store YouTube access token for API usage
      res.redirect("/admin/youtube-setup?success=oauth_connected");
    }
  );

  // Facebook auth routes
  app.get("/api/auth/facebook",
    passport.authenticate("facebook", { scope: ["email"] })
  );

  app.get("/api/auth/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "/api/auth/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // Login page route
  app.get("/api/auth/login", (req, res) => {
    res.redirect("/?auth=login");
  });

  // Logout route
  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    
    req.logout(() => {
      if (user?.provider === 'replit') {
        // Replit logout redirect
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      } else {
        // Regular logout redirect
        res.redirect("/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For Replit auth, check token expiration
  if (user.provider === 'replit' && user.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        return next();
      } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
      }
    }
  }

  return next();
};