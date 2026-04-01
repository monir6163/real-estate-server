import * as z from "zod";
import { Role } from "../../../generated/prisma/enums";

export const UserValidation = {
  updateProfileSchema: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters")
        .optional(),
      email: z.string().email("Invalid email address").optional(),
      phone: z
        .string()
        .min(10, "Phone must be at least 10 characters")
        .max(20, "Phone must not exceed 20 characters")
        .optional(),
      bio: z.string().max(500, "Bio must not exceed 500 characters").optional(),
      profileImage: z.string().optional(),
    }),
  }),

  changePasswordSchema: z.object({
    body: z
      .object({
        currentPassword: z
          .string()
          .min(8, "Current password must be at least 8 characters"),
        newPassword: z
          .string()
          .min(8, "New password must be at least 8 characters")
          .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Password must contain uppercase, lowercase, and number",
          ),
        confirmPassword: z.string(),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      }),
  }),

  updateRoleSchema: z.object({
    body: z.object({
      role: z.nativeEnum(Role),
    }),
  }),
};
