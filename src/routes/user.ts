import express from "express";
import prisma from "../prisma";
import jwt from "jsonwebtoken";

const router = express.Router();
const TOKEN_SECRET = "LMAO";

function generateAccessToken(user: object) {
  return jwt.sign({ ...user, password: undefined }, TOKEN_SECRET, {
    expiresIn: "7d",
  });
}

export function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, TOKEN_SECRET, async (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    let u = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });
    if (u == null) return res.sendStatus(403);

    req.user = user;
    next();
  });
}

router.get("/me", authenticateToken, async (req: any, res) => {
  res.json(req.user);
});

router.post("/signup", (req, res) => {
  const { email, password } = req.body;
  prisma.user
    .create({
      data: {
        email,
        password,
      },
    })
    .then((user) => {
      res.json({
        user,
        token: generateAccessToken(user),
      });
    })
    .catch((err) => {
      res.status(500).json({
        message: err.message,
      });
    });
});

router.post("/signin", (req, res) => {
  const { email, password } = req.body;
  prisma.user
    .findFirst({
      where: {
        email,
        password,
      },
    })
    .then((user: any) => {
      if (!user) {
        res.status(401).json({
          message: "Invalid email or password",
        });
      } else {
        res.json({
          user,
          token: generateAccessToken(user),
        });
      }
    })
    .catch((err: any) => {
      res.status(500).json({
        message: err.message,
      });
    });
});

router.get("/favorite", authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || 10;
  limit = Math.max(limit, 50);
  const offset = (page - 1) * limit;
  const favorites = await prisma.userFavoriteLocation.findMany({
    take: limit,
    skip: offset,
    where: {
      userId,
    },
  });
  const total = await prisma.userFavoriteLocation.count({
    where: {
      userId,
    },
  });
  const current_page = page;
  const total_page = Math.ceil(total / limit);
  res.json({
    favorites,
    current_page,
    total_page,
  });
});

router.post("/favorite", authenticateToken, async (req: any, res) => {
  const { id } = req.user;
  const locationId = parseInt(req.body.locationId);
  const favorite = await prisma.userFavoriteLocation.findFirst({
    where: {
      userId: id,
      locationId,
    },
  });
  if (!favorite) {
    await prisma.userFavoriteLocation.create({
      data: {
        userId: id,
        locationId,
      },
    });
    res.json({
      message: "Location added to favorites",
    });
  } else {
    await prisma.userFavoriteLocation.delete({
      where: { id: favorite.id },
    });
    res.json({
      message: "Location removed from favorites",
    });
  }
});

router.get("/test", authenticateToken, (req: any, res) => {
  res.json({
    user: req.user,
  });
});

export default router;
