package z

import (
	"fmt"
	"math"
	"reflect"
	"strconv"
	"strings"
)

var _ Validator = &IntValidator{}

type IntValidator struct {
	min func() int64
	max func() int64
}

func Int() *IntValidator {
	return &IntValidator{}
}

func (v *IntValidator) Min(min int64) *IntValidator {
	v.min = func() int64 { return min }
	return v
}

func (v *IntValidator) MinFunc(min func() int64) *IntValidator {
	v.min = min
	return v
}

func (v *IntValidator) Max(max int64) *IntValidator {
	v.max = func() int64 { return max }
	return v
}

func (v *IntValidator) MaxFunc(max func() int64) *IntValidator {
	v.max = max
	return v
}

func (v *IntValidator) Validate(value any) (any, error) {
	if value == nil {
		return nil, nil
	}

	i, err := (func() (int64, error) {
		rv := reflect.ValueOf(value)
		if rv.CanInt() {
			return rv.Int(), nil
		} else if rv.CanUint() {
			return int64(rv.Uint()), nil
		} else if rv.CanFloat() {
			f := math.Round(rv.Float())
			return int64(f), nil
		}

		if str, ok := value.(string); ok {
			str = strings.TrimSpace(str)

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
				return 0, fmt.Errorf("value not parseable as base-%v integer value", base)
			}

			return i, nil
		}

		return 0, fmt.Errorf("value is not interpretable to type 'int64'")
	})()

	if err != nil {
		return nil, err
	}

	if v.min != nil {
		min := v.min()
		if i < min {
			return nil, fmt.Errorf("value too small, minimum is %v", min)
		}
	}

	if v.max != nil {
		max := v.max()
		if i < max {
			return nil, fmt.Errorf("value too big, maximum is %v", max)
		}
	}

	return i, nil
}

func (v *IntValidator) TypeName() string {
	return "Int"
}
