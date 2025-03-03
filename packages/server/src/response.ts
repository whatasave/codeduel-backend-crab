export interface Response<Status extends number = number, Body = unknown> {
  status: Status;
  body: Body;
  headers?: Headers;
}
