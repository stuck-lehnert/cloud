package z

import (
	"fmt"
	"reflect"
)

var _ Validator = &ObjectValidator{}

type ObjectValidator struct {
	fields map[string]Validator
}

func Object(fields map[string]Validator) *ObjectValidator {
	return &ObjectValidator{fields}
}

func (v *ObjectValidator) Validate(value any) (any, error) {
	if value == nil {
		return nil, nil
	}

	rv := reflect.ValueOf(value)
	if rv.Kind() != reflect.Map || rv.Type().Key().Kind() != reflect.String {
		return nil, fmt.Errorf("object value must be of type 'map[string]any'")
	}

	result := map[string]any{}
	for attr, validator := range v.fields {
		found := false
		value := any(nil)
		for _, key := range rv.MapKeys() {
			if key.String() == attr {
				found = true
				value = rv.MapIndex(key).Interface()
				break
			}
		}

		if !found && IsOptional(validator) {
			continue
		}

		validated, err := validator.Validate(value)
		if err != nil {
			return nil, fmt.Errorf("error validating field '%s': %v", attr, err)
		}

		result[attr] = validated
	}

	return result, nil
}

func (v *ObjectValidator) TypeName() string {
	return "object"
}

type optionalValidator struct {
	wrapped Validator
}

// optional does not mean nullable; optional signals optional object members
func Optional(wrapped Validator) Validator {
	return &optionalValidator{wrapped}
}

func IsOptional(v Validator) bool {
	_, ok := v.(*optionalValidator)
	return ok
}

func (v *optionalValidator) Validate(value any) (any, error) {
	return v.wrapped.Validate(value)
}

func (v *optionalValidator) TypeName() string {
	return fmt.Sprintf("%s?", v.wrapped.TypeName())
}
