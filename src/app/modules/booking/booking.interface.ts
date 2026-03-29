import { RequestStatus } from "../../../generated/prisma/enums";

export interface IBooking {
  agentId: string;
  propertyId: string;
  status: RequestStatus;
  message?: string;
  visitDate: Date;
}
