export const DEFAULT_LAYER_NAME = /^(?:frame|group|rectangle|vector|text|ellipse|line|polygon|star|component|instance|section)(?:\s*[#_-]?\d+)?$/i;

export const INTERACTIVE_COMPONENT_NAME = /^(?:Button|Link|Checkbox|Radio button|Select|Combobox|Toggle|Tabs?|Pagination|Menu|Datepicker|File upload)(?:\s*\/|$)/i;

export const GENERIC_COMPONENT_PROPERTY = /^(?:property|type|value|option|state\s*\d+|variant\s*\d+)$/i;

export const ABBREVIATED_COMPONENT_VALUE = /^(?:xs|sm|md|lg|xl|xxl|btn|pri|sec)$/i;
