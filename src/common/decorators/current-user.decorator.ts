import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface JwtPayload {
  userId: number;
  email: string;
  plan: string;
}

//For REST
// export const CurrentUser = createParamDecorator(
//   (data: unknown, ctx: ExecutionContext): JwtPayload => {
//     const request = ctx.switchToHttp().getRequest();
//     return request.user;
//   },
// );

// GraphQL
export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): JwtPayload => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    return request?.user;
  },
);
