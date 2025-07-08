package z

import (
	"fmt"
	"reflect"
)

var _ Validator = &ArrayValidator{}

type ArrayValidator struct {
	wrapped Validator
	minLen  int
	maxLen  int
}

func Array(wrapped Validator) *ArrayValidator {
	return &ArrayValidator{
		wrapped: wrapped,
		minLen:  -1,
		maxLen:  -1,
	}
}

func (v *ArrayValidator) Min(min uint) *ArrayValidator {
	v.minLen = int(min)
	return v
}

func (v *ArrayValidator) Max(max uint) *ArrayValidator {
	v.maxLen = int(max)
	return v
}

func (v *ArrayValidator) Validate(value any) (any, error) {
	if value == nil {
		return nil, nil
	}

	rv := reflect.ValueOf(value)
	if rv.Kind() == reflect.Array || rv.Kind() == reflect.Slice {
		rv = rv.Slice(0, rv.Len())

		result := make([]any, rv.Len())
		for i := range rv.Len() {
			el := rv.Index(i).Interface()

			el, err := v.wrapped.Validate(el)
			if err != nil {
				return nil, fmt.Errorf("invalid element at index %v: %v", i, err)
			}

			result[i] = el
		}

		return result, nil
	}

	return nil, fmt.Errorf("value cannot be interpreted as 'array'")
}

func (v *ArrayValidator) TypeName() string {
	return fmt.Sprintf("[%s]", v.wrapped.TypeName())
}
