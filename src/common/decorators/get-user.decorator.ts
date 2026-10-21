import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    let req: any;
    if (ctx.getType<string>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(ctx);
      req = gqlCtx.getContext()?.req;
    } else {
      req = ctx.switchToHttp().getRequest();
    }
    const user = req?.user;
    return data ? user?.[data] : user;
  },
);

