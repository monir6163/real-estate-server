import * as z from "zod";

export const AuthValidation = {
  patientRegistrationSchema: z.object({
    body: z.object({
      name: z.string().nonempty("Name is required"),
      email: z.string().email("Invalid email address"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters long"),
    }),
  }),
  patientLoginSchema: z.object({
    body: z.object({
      email: z.string().email("Invalid email address"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters long"),
    }),
  }),
  changePasswordSchema: z.object({
    body: z.object({
      currentPassword: z
        .string()
        .min(8, "Current password must be at least 8 characters long"),
      newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters long"),
    }),
  }),

  forgotPasswordSchema: z.object({
    body: z.object({
      email: z.string().email("Invalid email address"),
    }),
  }),

  resetPasswordSchema: z.object({
    body: z.object({
      email: z.string().email("Invalid email address"),
      otp: z.string().length(6, "OTP must be 6 characters long"),
      newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters long"),
    }),
  }),
};
