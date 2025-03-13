import type { Response } from './types';

type HeadersLike = Headers | Record<string, string | string[]>;

export function response<Status extends number, Body>(
  status: Status,
  body: Body,
  headers?: HeadersLike
): Response<Status, Body> {
  if (typeof headers === 'object') {
    const headersObject = new Headers();
    for (const [key, value] of Object.entries(headers as Record<string, string | string[]>)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headersObject.append(key, v);
        }
      } else {
        headersObject.set(key, value);
      }
    }
    headers = headersObject;
  }
  return { status, body, headers };
}

function responseFunction<Status extends number>(
  status: Status
): (<T>(body: T) => Response<Status, T>) & ((body?: undefined) => Response<Status, undefined>) {
  return <T>(body: T, headers?: HeadersLike) => response(status, body, headers);
}

export const continue_ = responseFunction(100);
export const switchingProtocols = responseFunction(101);
export const ok = responseFunction(200);
export const created = responseFunction(201);
export const accepted = responseFunction(202);
export const noContent = responseFunction(204);
export const resetContent = responseFunction(205);
export const partialContent = responseFunction(206);
export const multipleChoices = responseFunction(300);
export const movedPermanently = responseFunction(301);
export const found = responseFunction(302);
export const seeOther = responseFunction(303);
export const notModified = responseFunction(304);
export const temporaryRedirect = responseFunction(307);
export const permanentRedirect = responseFunction(308);
export const badRequest = responseFunction(400);
export const unauthorized = responseFunction(401);
export const paymentRequired = responseFunction(402);
export const forbidden = responseFunction(403);
export const notFound = responseFunction(404);
export const methodNotAllowed = responseFunction(405);
export const notAcceptable = responseFunction(406);
export const proxyAuthenticationRequired = responseFunction(407);
export const requestTimeout = responseFunction(408);
export const conflict = responseFunction(409);
export const gone = responseFunction(410);
export const lengthRequired = responseFunction(411);
export const preconditionFailed = responseFunction(412);
export const payloadTooLarge = responseFunction(413);
export const uriTooLong = responseFunction(414);
export const unsupportedMediaType = responseFunction(415);
export const rangeNotSatisfiable = responseFunction(416);
export const expectationFailed = responseFunction(417);
export const misdirectedRequest = responseFunction(421);
export const unprocessableEntity = responseFunction(422);
export const upgradeRequired = responseFunction(426);
export const internalServerError = responseFunction(500);
export const notImplemented = responseFunction(501);
export const badGateway = responseFunction(502);
export const serviceUnavailable = responseFunction(503);
export const gatewayTimeout = responseFunction(504);
export const httpVersionNotSupported = responseFunction(505);
