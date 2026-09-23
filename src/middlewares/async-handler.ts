import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response) => Promise<unknown>;

// Express 4 no propaga rechazos de promesas al error handler solo; este
// wrapper evita repetir try/catch en cada controller.
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
