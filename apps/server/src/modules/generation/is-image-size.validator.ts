import { isValidImageSize } from '@novacanvas/types';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isImageSize', async: false })
export class IsImageSizeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isValidImageSize(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be auto or WxH within GPT Image 2 constraints`;
  }
}

export function IsImageSize(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsImageSizeConstraint,
    });
  };
}
