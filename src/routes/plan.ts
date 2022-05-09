import express from "express";
import prisma from "../prisma";
import axios from "axios";
const router = express.Router();

router.get("/", async (req: any, res) => {
  const userId = req.user.id;

  const page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || 10;
  limit = Math.max(limit, 20);
  const offset = (page - 1) * limit;

  const plans = await prisma.plan.findMany({
    take: limit,
    skip: offset,
    where: {
      userId: userId,
    },
    include: {
      _count: {
        select: {
          PlanLocation: true,
        },
      },
    },
  });
  const total = await prisma.plan.count({
    where: {
      userId: userId,
    },
  });
  const current_page = page;
  const total_page = Math.ceil(total / limit);
  res.json({
    plans,
    current_page,
    total_page,
  });
});

router.get("/:id", async (req: any, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;

  const plan = await prisma.plan.findFirst({
    where: {
      id: id,
      userId,
    },
    include: {
      PlanLocation: true,
    },
  });
  res.json(plan);
});

router.post("/", async (req: any, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  const thumbnail: string = await axios
    .get("https://source.unsplash.com/random/1600x900/?nature,travel")
    .then((response: any) => response.request.res.responseUrl);
  const plan = await prisma.plan.create({
    data: {
      name,
      userId,
      thumbnail,
    },
  });
  res.json(plan);
});

router.delete("/:id", async (req: any, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;
  const plan = await prisma.plan.findFirst({
    where: {
      id,
      userId,
    },
  });
  if (!plan) {
    res.status(404).json({
      message: "Plan not found",
    });
  } else {
    await prisma.plan.delete({
      where: {
        id,
      },
    });
    res.json({
      message: "Plan deleted",
    });
  }
});

router.put("/:id", async (req: any, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;
  const { name } = req.body;
  const plan = await prisma.plan.findFirst({
    where: {
      id,
      userId,
    },
  });
  if (!plan) {
    res.status(404).json({
      message: "Plan not found",
    });
  } else {
    const new_plan = await prisma.plan.update({
      where: {
        id,
      },
      data: {
        name,
      },
    });
    res.json(new_plan);
  }
});

router.post("/:id/location", async (req: any, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;
  const locationId = parseInt(req.body.locationId);
  const date = new Date(req.body.date);
  const numberOfPeople = parseInt(req.body.numberOfPeople);

  const plan = await prisma.plan.findFirst({
    where: {
      id,
      userId,
    },
  });
  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
    },
  });
  if (!location) {
    res.status(404).json({
      message: "Location not found",
    });
  } else if (!plan) {
    res.status(404).json({
      message: "Plan not found",
    });
  } else {
    const planLocation = await prisma.planLocation.create({
      data: {
        planId: plan.id,
        locationId,
        numberOfPeople,
        date: date,
      },
    });
    res.json(planLocation);
  }
});

router.delete("/:id/location/:locationId", async (req: any, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;
  const locationId = parseInt(req.params.locationId);
  const plan = await prisma.plan.findFirst({
    where: {
      id,
      userId,
    },
  });
  if (!plan) {
    res.status(404).json({
      message: "Plan not found",
    });
  } else {
    const result = await prisma.planLocation.delete({
      where: {
        id: locationId,
      },
    });
    res.json({
      message: "Location deleted",
    });
  }
});

router.put("/:id/location/:locationId", async (req: any, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;
  const locationId = parseInt(req.params.locationId);
  const date = new Date(req.body.date);
  const numberOfPeople = parseInt(req.body.numberOfPeople);
  const plan = await prisma.plan.findFirst({
    where: {
      id,
      userId,
    },
  });
  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
    },
  });
  if (!location) {
    res.status(404).json({
      message: "Location not found",
    });
  } else if (!plan) {
    res.status(404).json({
      message: "Plan not found",
    });
  } else {
    const new_planLocation = await prisma.planLocation.update({
      where: {
        id: locationId,
      },
      data: {
        numberOfPeople,
        date: date,
      },
    });
    res.json(new_planLocation);
  }
});

export default router;
