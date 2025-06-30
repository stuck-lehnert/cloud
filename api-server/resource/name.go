package resource

import (
	"fmt"
	"regexp"
)

func CheckName(name string) error {
	pattern := `^[a-zA-Z0-9_]+$`

	ok, _ := regexp.Match(pattern, []byte(name))
	if !ok {
		return fmt.Errorf("resource-related name '%s' must comply with pattern %s, but does not", name, pattern)
	}

	return nil
}
