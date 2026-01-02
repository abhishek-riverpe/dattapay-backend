class AppError {
  status: number;
  message: string;

  constructor(status: number, message: string) {
    this.message = message;
    this.status = status;
  }
}

export default AppError;
