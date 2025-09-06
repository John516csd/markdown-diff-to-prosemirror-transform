// AI处理器模拟 - 用于演示AI如何增强文档内容

export class AIProcessor {
  async enhance(markdown: string): Promise<string> {
    // 模拟AI处理延迟
    await this.delay(2000);
    
    // 应用各种AI增强策略
    let enhanced = markdown;
    
    // 1. 改进标题
    enhanced = this.enhanceHeadings(enhanced);
    
    // 2. 添加详细描述
    enhanced = this.addDescriptions(enhanced);
    
    // 3. 改进代码示例
    enhanced = this.enhanceCodeExamples(enhanced);
    
    // 4. 添加最佳实践建议
    enhanced = this.addBestPractices(enhanced);
    
    // 5. 改进格式和结构
    enhanced = this.improveStructure(enhanced);
    
    return enhanced;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private enhanceHeadings(markdown: string): string {
    // 改进API文档标题
    if (markdown.includes('API Documentation')) {
      markdown = markdown.replace('API Documentation', 'Complete API Reference Guide');
    }
    
    // 添加版本信息
    if (markdown.includes('# Complete API Reference Guide')) {
      markdown = markdown.replace(
        '# Complete API Reference Guide',
        '# Complete API Reference Guide v2.0\n\n> 📅 Last updated: ' + new Date().toLocaleDateString()
      );
    }
    
    return markdown;
  }

  private addDescriptions(markdown: string): string {
    // 为REST API添加更详细的描述
    if (markdown.includes('This is our **REST API** documentation.')) {
      markdown = markdown.replace(
        'This is our **REST API** documentation.',
        'This is our comprehensive **GraphQL API** documentation. Our API provides a flexible, efficient way to query and mutate data with strong type safety and introspection capabilities.\n\n## Key Features\n\n- 🚀 High performance with query optimization\n- 🔐 Built-in authentication and authorization\n- 📊 Real-time subscriptions support\n- 🛡️ Input validation and sanitization\n- 📈 Comprehensive monitoring and analytics'
      );
    }

    return markdown;
  }

  private enhanceCodeExamples(markdown: string): string {
    // 改进代码示例
    if (markdown.includes('fetch("/api/users")')) {
      markdown = markdown.replace(
        'fetch("/api/users")\n  .then(res => res.json())\n  .then(console.log);',
        `// GraphQL Query Example
const query = \`
  query GetUsers($limit: Int!, $offset: Int!) {
    users(limit: $limit, offset: $offset) {
      id
      name
      email
      createdAt
      profile {
        avatar
        bio
      }
    }
  }
\`;

const response = await fetch('/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${token}\`
  },
  body: JSON.stringify({
    query,
    variables: { limit: 10, offset: 0 }
  })
});

const { data, errors } = await response.json();
console.log(data.users);`
      );
    }

    return markdown;
  }

  private addBestPractices(markdown: string): string {
    // 添加认证部分
    if (markdown.includes('## Endpoints')) {
      markdown = markdown.replace(
        '## Endpoints',
        `## Authentication

All API requests require authentication using JWT Bearer tokens. Include the token in the Authorization header:

\`\`\`http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### Getting Started

1. Register for an API key at our developer portal
2. Use the key to obtain a JWT token via the /auth endpoint
3. Include the token in all subsequent requests

## Available Operations`
      );
    }

    // 改进端点列表
    if (markdown.includes('Available endpoints:')) {
      markdown = markdown.replace(
        `Available endpoints:

- GET /api/users
- POST /api/users`,
        `### Query Operations

- **users** - Retrieve user information with filtering and pagination
- **user(id: ID!)** - Get a specific user by ID
- **me** - Get current authenticated user information

### Mutation Operations  

- **createUser(input: CreateUserInput!)** - Register a new user
- **updateUser(id: ID!, input: UpdateUserInput!)** - Update user information
- **deleteUser(id: ID!)** - Remove a user account

### Subscription Operations

- **userUpdated(userId: ID!)** - Listen for user profile changes
- **newMessages** - Real-time message notifications`
      );
    }

    return markdown;
  }

  private improveStructure(markdown: string): string {
    // 添加错误处理部分
    if (!markdown.includes('Error Handling')) {
      markdown += `

## Error Handling

The API returns structured error responses in the following format:

\`\`\`json
{
  "errors": [
    {
      "message": "User not found",
      "code": "USER_NOT_FOUND",
      "path": ["user"],
      "extensions": {
        "userId": "123"
      }
    }
  ]
}
\`\`\`

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| \`UNAUTHORIZED\` | Invalid or missing authentication | 401 |
| \`FORBIDDEN\` | Insufficient permissions | 403 |
| \`NOT_FOUND\` | Resource does not exist | 404 |
| \`VALIDATION_ERROR\` | Invalid input data | 400 |
| \`RATE_LIMITED\` | Too many requests | 429 |

## Rate Limiting

API requests are rate-limited to ensure fair usage:

- **Free tier**: 100 requests per hour
- **Pro tier**: 1,000 requests per hour  
- **Enterprise**: Unlimited requests

Rate limit information is included in response headers:

\`\`\`http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
\`\`\`

## SDK and Tools

Official SDKs are available for:

- **JavaScript/TypeScript**: \`npm install @ourapi/sdk\`
- **Python**: \`pip install ourapi-sdk\`
- **Go**: \`go get github.com/ourapi/go-sdk\`
- **Java**: Available via Maven Central

### GraphQL Playground

Interactive API explorer available at: \`https://api.example.com/graphql\``;
    }

    return markdown;
  }
}
