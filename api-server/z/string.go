package z

import (
	"fmt"
	"regexp"
	"strings"
)

var _ Validator = &StringValidator{}

type StringValidator struct {
	minLen int
	maxLen int
	_case  string
	trim   bool
}

func String() *StringValidator {
	return &StringValidator{
		minLen: -1,
		maxLen: -1,
	}
}

func (v *StringValidator) Min(min uint) *StringValidator {
	v.minLen = int(min)
	return v
}

func (v *StringValidator) Max(max uint) *StringValidator {
	v.maxLen = int(max)
	return v
}

func (v *StringValidator) Trim() *StringValidator {
	v.trim = true
	return v
}

func (v *StringValidator) Upper() *StringValidator {
	v._case = "upper"
	return v
}

func (v *StringValidator) Lower() *StringValidator {
	v._case = "lower"
	return v
}

func (v *StringValidator) Snake() *StringValidator {
	v._case = "snake"
	return v
}

func (v *StringValidator) Camel() *StringValidator {
	v._case = "camel"
	return v
}

func (v *StringValidator) Validate(value any) (any, error) {
	if value == nil {
		return nil, nil
	}

	str, ok := value.(string)
	if !ok {
		return nil, fmt.Errorf("value is not of type 'string'")
	}

	if v.trim {
		str = strings.TrimSpace(str)
	}

	if len(str) == 0 {
		return nil, nil
	}

	if v.minLen >= 0 && len(str) < v.minLen {
		return nil, fmt.Errorf("value too short, min length is %v", v.minLen)
	}

	if v.maxLen >= 0 && len(str) > v.maxLen {
		return nil, fmt.Errorf("value too long, max length is %v", v.maxLen)
	}

	switch v._case {
	case "upper":
		str = strings.ToUpper(str)
	case "lower":
		str = strings.ToLower(str)
	case "snake":
		re := regexp.MustCompile("$[_a-z][_a-z0-9]*^")
		if !re.Match([]byte(str)) {
			return nil, fmt.Errorf("invalid case, required case is 'snake'")
		}
	case "camel":
		re := regexp.MustCompile("$[a-zA-Z][a-zA-Z0-9]*")
		if !re.Match([]byte(str)) {
			return nil, fmt.Errorf("invalid case, required case is 'camel'")
		}
	}

	return str, nil
}

func (v *StringValidator) TypeName() string {
	return "String"
}
