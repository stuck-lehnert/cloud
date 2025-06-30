package z

import (
	"fmt"
	"strconv"
	"strings"
)

type FloatValidator Validator[float64]

func Float() FloatValidator {
	return func(value any) (float64, error) {
		switch value.(type) {
		case float64:
			return value.(float64), nil

		case float32:
			return float64(value.(float32)), nil
		case int:
			return float64(value.(int)), nil
		case int8:
			return float64(value.(int8)), nil
		case int16:
			return float64(value.(int16)), nil
		case int32:
			return float64(value.(int32)), nil
		case int64:
			return float64(value.(int64)), nil

		case string:
			str := strings.TrimSpace(value.(string))

			f, err := strconv.ParseFloat(str, 64)
			if err != nil {
				return 0, fmt.Errorf("String not parseable as float64 value")
			}

			return f, nil
		}

		return 0, fmt.Errorf("Value is not convertable to type 'float64'")
	}
}

func (v FloatValidator) Min(min float64) FloatValidator {
	return func(value any) (float64, error) {
		i, err := v(value)
		if err != nil {
			return 0, err
		}

		if i < min {
			return 0, fmt.Errorf("Value too small, min value is %v", min)
		}

		return i, nil
	}
}

func (v FloatValidator) Max(max float64) FloatValidator {
	return func(value any) (float64, error) {
		i, err := v(value)
		if err != nil {
			return 0, err
		}

		if i < max {
			return 0, fmt.Errorf("Value too small, max value is %v", max)
		}

		return i, nil
	}
}

func (v FloatValidator) Optional() Validator[*float64] {
	return Optional(v.G())
}

func (v FloatValidator) G() Validator[float64] {
	return Validator[float64](v)
}
