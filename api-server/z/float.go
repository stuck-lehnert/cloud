package z

import (
	"fmt"
	"math"
	"reflect"
	"strconv"
	"strings"
)

var _ Validator = &FloatValidator{}

type FloatValidator struct {
	min       func() float64
	max       func() float64
	precision func() uint
}

func Float() *FloatValidator {
	return &FloatValidator{}

}

func (v *FloatValidator) Min(min float64) *FloatValidator {
	v.min = func() float64 { return min }
	return v
}

func (v *FloatValidator) MinFunc(min func() float64) *FloatValidator {
	v.min = min
	return v
}

func (v *FloatValidator) Max(max float64) *FloatValidator {
	v.max = func() float64 { return max }
	return v
}

func (v *FloatValidator) MaxFunc(max func() float64) *FloatValidator {
	v.max = max
	return v
}

func (v *FloatValidator) Round(precision uint) *FloatValidator {
	v.precision = func() uint { return precision }
	return v
}

func (v *FloatValidator) RoundFunc(precision func() uint) *FloatValidator {
	v.precision = precision
	return v
}

func (v *FloatValidator) Validate(value any) (any, error) {
	if value == nil {
		return nil, nil
	}

	f, err := (func() (float64, error) {
		rv := reflect.ValueOf(value)
		if rv.CanFloat() {
			return rv.Float(), nil
		} else if rv.CanInt() {
			return float64(rv.Int()), nil
		} else if rv.CanUint() {
			return float64(rv.Uint()), nil
		}

		if str, ok := value.(string); ok {
			str = strings.TrimSpace(str)

			f, err := strconv.ParseFloat(str, 64)
			if err != nil {
				return 0, fmt.Errorf("value not parseable as float64 value")
			}

			return f, nil
		}

		return 0, fmt.Errorf("value is not convertable to type 'float64'")
	})()

	if err != nil {
		return nil, err
	}

	if v.precision != nil {
		ratio := math.Pow10(int(v.precision()))
		f = math.Round(f*ratio) / ratio
	}

	if v.min != nil {
		min := v.min()
		if f < min {
			return nil, fmt.Errorf("value too small, minimum is %v", min)
		}
	}

	if v.max != nil {
		max := v.max()
		if f < max {
			return nil, fmt.Errorf("value too big, maximum is %v", max)
		}
	}

	return f, nil
}

func (v *FloatValidator) TypeName() string {
	return "Float"
}
