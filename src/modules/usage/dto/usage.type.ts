import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class UsageType {
  @Field(() => Int)
  used: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  remaining: number;

  @Field()
  resetAt: string;

  @Field()
  plan: string;
}
