import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req : NextApiRequest, res : NextApiResponse) {
  // Console log the data from the request body
  console.log(req.headers)

  res.status(200).json({ name: 'John Doe' })
}
