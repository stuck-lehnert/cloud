package z

import (
	"fmt"
	"strings"
)

type StringValidator Validator[string]

func String() Validator[string] {
	return func(value any) (string, error) {
		str, ok := value.(string)
		if !ok {
			return "", fmt.Errorf("Value is not of type 'string'")
		}

		return str, nil
	}
}

func (v StringValidator) Min(min int) StringValidator {
	return func(value any) (string, error) {
		str, err := v(value)
		if err != nil {
			return "", err
		}

		if len(str) < min {
			return "", fmt.Errorf("String too short, min length is %v", min)
		}

		return str, nil
	}
}

func (v StringValidator) Max(max int) StringValidator {
	return func(value any) (string, error) {
		str, err := v(value)
		if err != nil {
			return "", err
		}

		if len(str) > max {
			return "", fmt.Errorf("String too long, max length is %v", max)
		}

		return str, nil
	}
}

func (v StringValidator) Trim() StringValidator {
	return func(value any) (string, error) {
		str, err := v(value)
		if err != nil {
			return "", err
		}

		return strings.TrimSpace(str), err
	}
}

func (v StringValidator) Upper() StringValidator {
	return func(value any) (string, error) {
		str, err := v(value)
		if err != nil {
			return "", err
		}

		return strings.ToUpper(str), err
	}
}

func (v StringValidator) Lower() StringValidator {
	return func(value any) (string, error) {
		str, err := v(value)
		if err != nil {
			return "", err
		}

		return strings.ToLower(str), err
	}
}

func (v StringValidator) Optional() Validator[*string] {
	return Optional(v.G())
}

func (v StringValidator) G() Validator[string] {
	return Validator[string](v)
}
