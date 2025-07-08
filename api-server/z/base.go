package z

import "fmt"

type Validator interface {
	Validate(value any) (any, error)
	TypeName() string
}

func Validate[T any](validator Validator, value any) (T, error) {
	var result T

	validated, err := validator.Validate(value)
	if err != nil {
		return result, err
	}

	return validated.(T), nil
}

type notnullValidator struct {
	wrapped Validator
}

func NotNull(v Validator) Validator {
	return &notnullValidator{v}
}

func IsNotNull(v Validator) bool {
	_, ok := v.(*notnullValidator)
	return ok
}

func (v *notnullValidator) Validate(value any) (any, error) {
	if value == nil {
		return nil, fmt.Errorf("value cannot be null, it is required")
	}

	validated, err := v.wrapped.Validate(value)
	if err != nil {
		return nil, err
	}

	if validated == nil {
		return nil, fmt.Errorf("value cannot be null-equivalent, it is required")
	}

	return validated, nil
}

func (v *notnullValidator) TypeName() string {
	return fmt.Sprintf("%s!", v.wrapped.TypeName())
}

type transformedValidator struct {
	wrapped   Validator
	transform func(value any) (any, error)
}

func Transform(v Validator, transform func(value any) (any, error)) Validator {
	return &transformedValidator{v, transform}
}

func (v *transformedValidator) Validate(value any) (any, error) {
	validated, err := v.wrapped.Validate(value)
	if err != nil {
		return nil, err
	}

	return v.transform(validated)
}

func (v *transformedValidator) TypeName() string {
	return v.wrapped.TypeName()
}
