import express from "express";
import prisma from "../prisma";

const router = express.Router();

router.get("/", async (req: any, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || 10;
  limit = Math.max(limit, 20);
  const offset = (page - 1) * limit;
  const plan_location = await prisma.planLocation.findMany({
    take: limit,
    skip: offset,
    where: {
      plan: {
        userId,
      },
      isVisited: {
        equals: false,
      },
    },
  });
  const total = await prisma.planLocation.count({
    where: {
      plan: {
        userId,
      },
      isVisited: false,
    },
  });
  const current_page = page;
  const total_page = Math.ceil(total / limit);
  res.json({
    plan_location,
    current_page,
    total_page,
  });
});

export default router;
