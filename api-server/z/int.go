package z

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

type IntValidator Validator[int64]

func Int() IntValidator {
	return func(value any) (int64, error) {
		switch value.(type) {
		case int64:
			return value.(int64), nil

		case int8:
			return int64(value.(int8)), nil
		case int16:
			return int64(value.(int16)), nil
		case int32:
			return int64(value.(int32)), nil
		case int:
			return int64(value.(int)), nil

		case float32, float64:
			f := math.Round(value.(float64))
			return int64(f), nil

		case string:
			str := strings.TrimSpace(value.(string))

			base := 10
			if strings.HasPrefix(str, "0b") {
				base = 2
				str = str[2:]
			} else if strings.HasPrefix(str, "0o") {
				base = 8
				str = str[2:]
			} else if strings.HasPrefix(str, "0x") {
				base = 16
				str = str[2:]
			}

			i, err := strconv.ParseInt(str, base, 64)
			if err != nil {
				return 0, fmt.Errorf("String not parseable as base-%v integer value", base)
			}

			return i, nil
		}

		return 0, fmt.Errorf("Value is not convertable to type 'int64'")
	}
}

func (v IntValidator) Min(min int64) IntValidator {
	return func(value any) (int64, error) {
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

func (v IntValidator) Max(max int64) IntValidator {
	return func(value any) (int64, error) {
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

func (v IntValidator) Optional() Validator[*int64] {
	return Optional(v.G())
}

func (v IntValidator) G() Validator[int64] {
	return Validator[int64](v)
}
