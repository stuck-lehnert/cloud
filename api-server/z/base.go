package z

import "reflect"

type Validator[T any] func(value any) (T, error)

func Optional[T any](v Validator[T]) Validator[*T] {
	return func(value any) (*T, error) {
		if value == nil {
			return nil, nil
		}

		validated, err := v(value)
		if err != nil {
			return nil, nil
		}

		if reflect.ValueOf(validated).IsNil() {
			return nil, nil
		}

		return &validated, nil
	}
}

func Transform[A any, B any](v Validator[A], transform func(value A) (B, error)) Validator[B] {
	return func(value any) (B, error) {
		var result B

		validated, err := v(value)
		if err != nil {
			return result, err
		}

		return transform(validated)
	}
}
