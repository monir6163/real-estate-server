import { Role } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";

const AdminCreateInitialData = async () => {
  try {
    const adminData = {
      name: "Admin",
      email: "monirhossain6163@gmail.com",
      password: "123456789",
      role: Role.ADMIN,
      phone: "01747706163",
    };
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminData.email },
    });
    if (existingAdmin) {
      console.log("Admin user already exists. Skipping creation.");
      return;
    }
    const adminUser = await fetch(
      `${process.env.BETTER_AUTH_URL}/api/auth/sign-up/email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: process.env.FRONTEND_URL as string,
        },
        body: JSON.stringify(adminData),
      },
    );
    if (adminUser.ok) {
      console.log("Initial admin user created successfully.");
    } else {
      console.error(
        "Failed to create admin user. Status:",
        adminUser.status,
        "Status Text:",
        adminUser.statusText,
      );
    }
  } catch (error) {
    console.error("Error creating initial admin data:", error);
  }
};

AdminCreateInitialData();
