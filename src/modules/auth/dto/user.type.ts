import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';

import { UserPlan } from '../entities/user.entity';

registerEnumType(UserPlan, {
  name: 'UserPlan',
  description: 'User subscription plan',
});

@ObjectType()
export class UserType {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field(() => UserPlan)
  plan: UserPlan;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class AuthPayload {
  @Field()
  token: string;

  @Field(() => UserType)
  user: UserType;
}
