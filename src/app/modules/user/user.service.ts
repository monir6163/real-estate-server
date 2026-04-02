import { StatusCodes } from "http-status-codes";
import { UserStatus } from "../../../generated/prisma/enums";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { IUser } from "./user.interface";

const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return (users as IUser[]) || [];
};

const updateUserStatus = async (userId: string, newStatus: UserStatus) => {
  // jodi kono agent er running booking thake tahole tar status ke active theke inactive kora jabe na
  const findProperty = await prisma.property.findMany({
    where: {
      agentId: userId,
      bookingRequests: {
        some: {
          status: "APPROVED",
        },
      },
    },
  });

  if (findProperty.length > 0 && newStatus === "INACTIVE") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Cannot set user to INACTIVE. User has active bookings.",
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });
  return updatedUser as IUser;
};

const updateProfile = async (
  userId: string,
  data: { name?: string; phone?: string; image?: string },
) => {
  console.log(userId, data);
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.phone && { phone: data.phone }),
      ...(data.image && { image: data.image }),
    },
  });
  return updatedUser as IUser;
};

export const UserService = {
  getAllUsers,
  updateUserStatus,
  updateProfile,
};
