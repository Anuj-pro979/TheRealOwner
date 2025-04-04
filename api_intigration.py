import requests
import json
import os
import importlib
import inspect
import re
import yaml
from typing import Dict, List, Any, Callable, Optional, Union
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('api_integration')

class APIEndpoint:
    """Class representing an API endpoint that can be called by the agent"""
    
    def __init__(self, name: str, description: str, method: str, url: str, 
                 headers: Dict = None, params: Dict = None, body_template: Dict = None,
                 required_params: List[str] = None, auth_type: str = None):
        self.name = name
        self.description = description
        self.method = method.upper()
        self.url = url
        self.headers = headers or {}
        self.params = params or {}
        self.body_template = body_template or {}
        self.required_params = required_params or []
        self.auth_type = auth_type
        
    def execute(self, **kwargs) -> Dict:
        """Execute the API call with the provided parameters"""
        try:
            # Process URL with parameters if needed (handle path params like /users/{user_id})
            url = self.url
            path_params = re.findall(r'\{([^}]+)\}', self.url)
            for param in path_params:
                if param in kwargs:
                    url = url.replace(f"{{{param}}}", str(kwargs.pop(param)))
                else:
                    raise ValueError(f"Required path parameter '{param}' not provided")
            
            # Process query parameters
            query_params = self.params.copy()
            for k, v in kwargs.items():
                if k.startswith('param_'):
                    param_name = k[6:]  # Remove 'param_' prefix
                    query_params[param_name] = v
            
            # Process body parameters
            body = None
            if self.method in ['POST', 'PUT', 'PATCH']:
                body = self.body_template.copy()
                for k, v in kwargs.items():
                    if k.startswith('body_'):
                        body_path = k[5:].split('.')  # Remove 'body_' prefix and split by dots
                        current = body
                        for i, part in enumerate(body_path):
                            if i == len(body_path) - 1:
                                current[part] = v
                            else:
                                if part not in current:
                                    current[part] = {}
                                current = current[part]
            
            # Check required parameters
            for param in self.required_params:
                # Check if parameter is in path parameters, query parameters, or body
                param_found = False
                if param in kwargs or param in query_params:
                    param_found = True
                elif body and self._check_param_in_dict(param, body):
                    param_found = True
                
                if not param_found:
                    raise ValueError(f"Required parameter '{param}' not provided")
            
            # Make the API call
            logger.info(f"Executing API call: {self.method} {url}")
            response = requests.request(
                method=self.method,
                url=url,
                headers=self.headers,
                params=query_params,
                json=body if body else None
            )
            
            # Handle response
            if response.status_code >= 400:
                logger.error(f"API call failed with status {response.status_code}: {response.text}")
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": response.text
                }
            
            # Try to parse as JSON, fallback to text if not possible
            try:
                result = response.json()
            except ValueError:
                result = {"text": response.text}
            
            return {
                "success": True,
                "status_code": response.status_code,
                "data": result
            }
            
        except Exception as e:
            logger.error(f"Error executing API call: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _check_param_in_dict(self, param: str, d: Dict) -> bool:
        """Check if a parameter exists in a nested dictionary"""
        if '.' in param:
            parts = param.split('.', 1)
            if parts[0] in d and isinstance(d[parts[0]], dict):
                return self._check_param_in_dict(parts[1], d[parts[0]])
            return False
        else:
            return param in d
    
    def to_dict(self) -> Dict:
        """Convert endpoint to dictionary for serialization"""
        return {
            "name": self.name,
            "description": self.description,
            "method": self.method,
            "url": self.url,
            "headers": self.headers,
            "params": self.params,
            "body_template": self.body_template,
            "required_params": self.required_params,
            "auth_type": self.auth_type
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'APIEndpoint':
        """Create endpoint from dictionary"""
        return cls(
            name=data["name"],
            description=data["description"],
            method=data["method"],
            url=data["url"],
            headers=data.get("headers", {}),
            params=data.get("params", {}),
            body_template=data.get("body_template", {}),
            required_params=data.get("required_params", []),
            auth_type=data.get("auth_type")
        )


class APIIntegration:
    """Class for managing API integrations"""
    
    def __init__(self, name: str, description: str, base_url: str = None,
                 auth_type: str = None, auth_params: Dict = None):
        self.name = name
        self.description = description
        self.base_url = base_url
        self.auth_type = auth_type
        self.auth_params = auth_params or {}
        self.endpoints: Dict[str, APIEndpoint] = {}
    
    def add_endpoint(self, endpoint: APIEndpoint) -> None:
        """Add an endpoint to this integration"""
        self.endpoints[endpoint.name] = endpoint
    
    def get_endpoint(self, name: str) -> Optional[APIEndpoint]:
        """Get an endpoint by name"""
        return self.endpoints.get(name)
    
    def execute_endpoint(self, endpoint_name: str, **kwargs) -> Dict:
        """Execute an endpoint by name"""
        endpoint = self.get_endpoint(endpoint_name)
        if not endpoint:
            return {"success": False, "error": f"Endpoint '{endpoint_name}' not found"}
        
        # If integration has auth parameters, apply them
        if self.auth_type and self.auth_params:
            if self.auth_type == "bearer":
                kwargs.setdefault("headers", {})
                kwargs["headers"]["Authorization"] = f"Bearer {self.auth_params.get('token', '')}"
            elif self.auth_type == "basic":
                kwargs.setdefault("headers", {})
                import base64
                auth_str = f"{self.auth_params.get('username', '')}:{self.auth_params.get('password', '')}"
                encoded = base64.b64encode(auth_str.encode()).decode()
                kwargs["headers"]["Authorization"] = f"Basic {encoded}"
            elif self.auth_type == "api_key":
                key_name = self.auth_params.get("key_name", "api_key")
                key_value = self.auth_params.get("key_value", "")
                location = self.auth_params.get("location", "header")
                
                if location == "header":
                    kwargs.setdefault("headers", {})
                    kwargs["headers"][key_name] = key_value
                elif location == "query":
                    kwargs.setdefault("params", {})
                    kwargs["params"][key_name] = key_value
        
        return endpoint.execute(**kwargs)
    
    def to_dict(self) -> Dict:
        """Convert integration to dictionary for serialization"""
        return {
            "name": self.name,
            "description": self.description,
            "base_url": self.base_url,
            "auth_type": self.auth_type,
            "auth_params": self.auth_params,
            "endpoints": {name: endpoint.to_dict() for name, endpoint in self.endpoints.items()}
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'APIIntegration':
        """Create integration from dictionary"""
        integration = cls(
            name=data["name"],
            description=data["description"],
            base_url=data.get("base_url"),
            auth_type=data.get("auth_type"),
            auth_params=data.get("auth_params", {})
        )
        
        for name, endpoint_data in data.get("endpoints", {}).items():
            endpoint = APIEndpoint.from_dict(endpoint_data)
            integration.add_endpoint(endpoint)
        
        return integration


class APIManager:
    """Class for managing all API integrations"""
    
    def __init__(self, storage_path: str = "api_integrations"):
        self.storage_path = storage_path
        self.integrations: Dict[str, APIIntegration] = {}
        
        # Create storage directory if it doesn't exist
        os.makedirs(storage_path, exist_ok=True)
        
        # Load existing integrations
        self.load_integrations()
    
    def load_integrations(self) -> None:
        """Load all integrations from storage"""
        for filename in os.listdir(self.storage_path):
            if filename.endswith(".yaml") or filename.endswith(".yml"):
                try:
                    with open(os.path.join(self.storage_path, filename), 'r') as f:
                        data = yaml.safe_load(f)
                        integration = APIIntegration.from_dict(data)
                        self.integrations[integration.name] = integration
                except Exception as e:
                    logger.error(f"Error loading integration from {filename}: {str(e)}")
    
    def save_integration(self, integration: APIIntegration) -> None:
        """Save an integration to storage"""
        filename = f"{integration.name.lower().replace(' ', '_')}.yaml"
        filepath = os.path.join(self.storage_path, filename)
        
        with open(filepath, 'w') as f:
            yaml.dump(integration.to_dict(), f, sort_keys=False, default_flow_style=False)
        
        # Add to in-memory collection
        self.integrations[integration.name] = integration
    
    def get_integration(self, name: str) -> Optional[APIIntegration]:
        """Get an integration by name"""
        return self.integrations.get(name)
    
    def execute_endpoint(self, integration_name: str, endpoint_name: str, **kwargs) -> Dict:
        """Execute an endpoint from a specific integration"""
        integration = self.get_integration(integration_name)
        if not integration:
            return {"success": False, "error": f"Integration '{integration_name}' not found"}
        
        return integration.execute_endpoint(endpoint_name, **kwargs)

    def discover_openapi(self, url: str, api_name: str = None, auth_header: str = None) -> Optional[APIIntegration]:
        """Discover and create integration from OpenAPI specification"""
        try:
            headers = {}
            if auth_header:
                headers["Authorization"] = auth_header
                
            response = requests.get(url, headers=headers)
            if response.status_code != 200:
                logger.error(f"Failed to fetch OpenAPI spec: {response.status_code}")
                return None
            
            spec = response.json()
            
            # Create integration object
            name = api_name or spec.get("info", {}).get("title", "Discovered API")
            description = spec.get("info", {}).get("description", "API discovered from OpenAPI specification")
            
            # Extract base URL
            servers = spec.get("servers", [])
            base_url = servers[0]["url"] if servers else None
            
            integration = APIIntegration(name=name, description=description, base_url=base_url)
            
            # Process paths
            paths = spec.get("paths", {})
            for path, methods in paths.items():
                for method, details in methods.items():
                    if method.lower() not in ["get", "post", "put", "delete", "patch"]:
                        continue
                    
                    endpoint_name = details.get("operationId", f"{method}_{path.replace('/', '_')}")
                    endpoint_desc = details.get("summary", "") or details.get("description", "")
                    
                    # Process parameters
                    required_params = []
                    query_params = {}
                    path_params = []
                    
                    for param in details.get("parameters", []):
                        param_name = param.get("name")
                        if param.get("required", False):
                            required_params.append(param_name)
                        
                        if param.get("in") == "query":
                            query_params[param_name] = None
                        elif param.get("in") == "path":
                            path_params.append(param_name)
                    
                    # Process request body
                    body_template = {}
                    if "requestBody" in details:
                        content = details["requestBody"].get("content", {})
                        if "application/json" in content:
                            schema = content["application/json"].get("schema", {})
                            if "properties" in schema:
                                for prop_name, prop_details in schema["properties"].items():
                                    body_template[prop_name] = None
                    
                    # Create endpoint
                    full_url = f"{base_url}{path}" if base_url else path
                    endpoint = APIEndpoint(
                        name=endpoint_name,
                        description=endpoint_desc,
                        method=method,
                        url=full_url,
                        params=query_params,
                        body_template=body_template,
                        required_params=required_params
                    )
                    
                    integration.add_endpoint(endpoint)
            
            return integration
            
        except Exception as e:
            logger.error(f"Error discovering OpenAPI: {str(e)}")
            return None
    
    def generate_code(self, integration_name: str, output_file: str = None) -> str:
        """Generate Python code for interacting with an integration"""
        integration = self.get_integration(integration_name)
        if not integration:
            return f"# Integration '{integration_name}' not found"
        
        code = []
        
        # Add imports
        code.append("import requests")
        code.append("import json")
        code.append("from typing import Dict, List, Any, Optional, Union")
        code.append("")
        
        # Create class
        class_name = integration.name.replace(" ", "")
        code.append(f"class {class_name}:")
        code.append(f'    """')
        code.append(f"    {integration.description}")
        code.append(f'    """')
        code.append("")
        
        # Add constructor
        code.append("    def __init__(self):")
        if integration.base_url:
            code.append(f'        self.base_url = "{integration.base_url}"')
        
        # Add auth parameters if needed
        if integration.auth_type:
            if integration.auth_type == "bearer":
                code. append('        self.token = ""  # Set your token here')
            elif integration.auth_type == "basic":
                code.append('        self.username = ""  # Set your username here')
                code.append('        self.password = ""  # Set your password here')
            elif integration.auth_type == "api_key":
                key_name = integration.auth_params.get("key_name", "api_key")
                code.append(f'        self.api_key = ""  # Set your {key_name} here')
        
        code.append("")
        
        # Add methods for each endpoint
        for endpoint_name, endpoint in integration.endpoints.items():
            # Create method name
            method_name = endpoint_name.replace("-", "_").lower()
            
            # Extract parameters from URL, query params, and body
            params = []
            
            # Path parameters
            path_params = re.findall(r'\{([^}]+)\}', endpoint.url)
            for param in path_params:
                params.append(f"{param}: str")
            
            # Query parameters
            for param in endpoint.params:
                if param not in path_params:
                    params.append(f"{param}: str = None")
            
            # Body parameters
            if endpoint.method in ["POST", "PUT", "PATCH"] and endpoint.body_template:
                for param in endpoint.body_template:
                    if param not in path_params and param not in endpoint.params:
                        params.append(f"{param}: Any = None")
            
            # Create method signature
            param_str = ", ".join(params)
            code.append(f"    def {method_name}(self, {param_str}) -> Dict:")
            code.append(f'        """')
            code.append(f"        {endpoint.description}")
            code.append(f"        ")
            for param in params:
                param_name = param.split(":")[0].strip()
                code.append(f"        :param {param_name}: Parameter description")
            code.append(f"        :return: API response")
            code.append(f'        """')
            
            # URL with path parameters
            url = endpoint.url
            if endpoint.url.startswith("/") and integration.base_url:
                url = f"self.base_url + '{endpoint.url}'"
            else:
                url = f"'{endpoint.url}'"
            
            # Replace path parameters
            for param in path_params:
                url = url.replace(f"{{{param}}}", f"' + str({param}) + '")
            
            code.append(f"        url = {url}")
            
            # Headers
            code.append("        headers = {")
            for header, value in endpoint.headers.items():
                code.append(f'            "{header}": "{value}",')
            code.append("        }")
            
            # Add auth headers if needed
            if integration.auth_type:
                code.append("")
                if integration.auth_type == "bearer":
                    code.append('        # Add authorization token')
                    code.append('        headers["Authorization"] = f"Bearer {self.token}"')
                elif integration.auth_type == "basic":
                    code.append('        # Add basic authentication')
                    code.append('        import base64')
                    code.append('        auth_str = f"{self.username}:{self.password}"')
                    code.append('        encoded = base64.b64encode(auth_str.encode()).decode()')
                    code.append('        headers["Authorization"] = f"Basic {encoded}"')
                elif integration.auth_type == "api_key":
                    key_name = integration.auth_params.get("key_name", "api_key")
                    location = integration.auth_params.get("location", "header")
                    if location == "header":
                        code.append('        # Add API key authentication')
                        code.append(f'        headers["{key_name}"] = self.api_key')
            
            # Query parameters
            if endpoint.params:
                code.append("")
                code.append("        params = {}")
                for param in endpoint.params:
                    code.append(f"        if {param} is not None:")
                    code.append(f'            params["{param}"] = {param}')
            
            # Body
            if endpoint.method in ["POST", "PUT", "PATCH"] and endpoint.body_template:
                code.append("")
                code.append("        body = {}")
                for param in endpoint.body_template:
                    code.append(f"        if {param} is not None:")
                    code.append(f'            body["{param}"] = {param}')
            
            # Make request
            code.append("")
            code.append("        try:")
            request_args = ["url"]
            if endpoint.params:
                request_args.append("params=params")
            if endpoint.headers or integration.auth_type:
                request_args.append("headers=headers")
            if endpoint.method in ["POST", "PUT", "PATCH"] and endpoint.body_template:
                request_args.append("json=body")
            
            request_args_str = ", ".join(request_args)
            code.append(f'            response = requests.{endpoint.method.lower()}({request_args_str})')
            code.append("            response.raise_for_status()")
            code.append("")
            code.append("            # Try to parse JSON response")
            code.append("            try:")
            code.append("                return response.json()")
            code.append("            except ValueError:")
            code.append("                return {\"text\": response.text}")
            code.append("        except Exception as e:")
            code.append("            return {\"error\": str(e)}")
            code.append("")
        
        # Add example usage
        code.append("# Example usage")
        code.append(f"if __name__ == \"__main__\":")
        code.append(f"    api = {class_name}()")
        
        # Set auth parameters if needed
        if integration.auth_type:
            if integration.auth_type == "bearer":
                code.append('    api.token = "YOUR_TOKEN_HERE"')
            elif integration.auth_type == "basic":
                code.append('    api.username = "YOUR_USERNAME_HERE"')
                code.append('    api.password = "YOUR_PASSWORD_HERE"')
            elif integration.auth_type == "api_key":
                code.append('    api.api_key = "YOUR_API_KEY_HERE"')
        
        # Add example call to first endpoint
        if integration.endpoints:
            first_endpoint = list(integration.endpoints.values())[0]
            method_name = first_endpoint.name.replace("-", "_").lower()
            
            # Prepare arguments
            args = []
            path_params = re.findall(r'\{([^}]+)\}', first_endpoint.url)
            for param in path_params:
                args.append(f'{param}="example"')
            
            args_str = ", ".join(args)
            
            code.append(f"    result = api.{method_name}({args_str})")
            code.append("    print(json.dumps(result, indent=2))")
        
        result = "\n".join(code)
        
        # Write to file if output_file is provided
        if output_file:
            os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
            with open(output_file, "w") as f:
                f.write(result)
        
        return result


def detect_api_format(api_description: str) -> Dict:
    """Detect the API format from a textual description"""
    # This is a simplified version - in a real implementation, we might use an LLM to parse this
    formats = {
        "rest": ["REST", "GET", "POST", "PUT", "DELETE", "HTTP", "endpoint"],
        "graphql": ["GraphQL", "query", "mutation", "schema", "resolver"],
        "soap": ["SOAP", "XML", "WSDL", "envelope"],
        "rpc": ["RPC", "procedure", "call", "method"]
    }
    
    counts = {format_name: 0 for format_name in formats}
    for format_name, keywords in formats.items():
        for keyword in keywords:
            if keyword.lower() in api_description.lower():
                counts[format_name] += 1
    
    # Find the format with the highest count
    max_count = max(counts.values())
    if max_count == 0:
        return {"detected_format": "unknown", "confidence": 0}
    
    detected_format = max(counts, key=counts.get)
    confidence = min(counts[detected_format] / len(formats[detected_format]), 1.0)
    
    return {"detected_format": detected_format, "confidence": confidence}


def extract_endpoints_from_description(api_description: str) -> List[Dict]:
    """Extract API endpoints from a textual description"""
    # This is a simplified version - in a real implementation, we would use an LLM for this
    endpoints = []
    
    # Simple regex to find patterns like "GET /users" or "POST /items"
    pattern = r'(GET|POST|PUT|DELETE|PATCH) (\/[a-zA-Z0-9\/\-_{}]+)'
    matches = re.findall(pattern, api_description)
    
    for method, path in matches:
        endpoints.append({
            "method": method,
            "path": path,
            "description": f"Endpoint for {method} {path}"
        })
    
    return endpoints