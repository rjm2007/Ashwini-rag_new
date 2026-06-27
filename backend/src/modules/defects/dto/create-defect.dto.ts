export class CreateDefectDto {
  documentId!: string;
  reportedDefect!: string;
  purchaseDate?: Date;
  currentMileage?: number;
}
