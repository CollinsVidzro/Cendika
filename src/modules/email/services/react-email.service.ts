// src/modules/email/services/react-email.service.ts

import { render } from '@react-email/render';
import * as React from 'react';
import { logger } from '@utils/logger';
import { ReactEmailProps } from '../types/email.types';

export class ReactEmailService {
  /**
   * Render React email component to HTML
   */
  async renderReactEmail(
    componentCode: string,
    props: ReactEmailProps = {}
  ): Promise<string> {
    try {
      // Create a function from the component code
      // This is a simplified version - in production, you'd want to use a proper sandbox
      const componentFunction = new Function('React', 'props', `
        ${componentCode}
        return Component(props);
      `);

      // Execute the function to get the React element
      const element = componentFunction(React, props);

      // Render to HTML
      const html = render(element);

      return html;
    } catch (error) {
      logger.error('Failed to render React email:', error);
      throw new Error('Failed to render email template');
    }
  }

  /**
   * Render React email component to plain text
   */
  async renderReactEmailText(
    componentCode: string,
    props: ReactEmailProps = {}
  ): Promise<string> {
    try {
      const componentFunction = new Function('React', 'props', `
        ${componentCode}
        return Component(props);
      `);

      const element = componentFunction(React, props);

      // Render to plain text
      const text = render(element, { plainText: true });

      return text;
    } catch (error) {
      logger.error('Failed to render React email to text:', error);
      throw new Error('Failed to render email template to text');
    }
  }

  /**
   * Validate React email component code
   */
  validateReactComponent(componentCode: string): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Basic validation checks
    if (!componentCode.includes('export default') && !componentCode.includes('const Component')) {
      errors.push('Component must be exported');
    }

    // Check for dangerous code patterns
    const dangerousPatterns = [
      'eval(',
      'Function(',
      'require(',
      'import(',
      'process.',
      'fs.',
      '__dirname',
      '__filename',
    ];

    for (const pattern of dangerousPatterns) {
      if (componentCode.includes(pattern)) {
        errors.push(`Dangerous pattern detected: ${pattern}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Create a default welcome email template
   */
  getWelcomeEmailTemplate(): string {
    return `
import { Html, Head, Body, Container, Heading, Text, Button, Link } from '@react-email/components';

const Component = ({ name, verificationUrl }) => (
  <Html>
    <Head />
    <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <Heading style={{ color: '#1a1a1a', fontSize: '24px', textAlign: 'center' }}>
          Welcome to AfriCom, {name}!
        </Heading>
        <Text style={{ color: '#333', fontSize: '16px', lineHeight: '24px' }}>
          Thank you for joining AfriCom. We're excited to have you on board!
        </Text>
        <Text style={{ color: '#333', fontSize: '16px', lineHeight: '24px' }}>
          To get started, please verify your email address by clicking the button below:
        </Text>
        <Button
          href={verificationUrl}
          style={{
            backgroundColor: '#007bff',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '4px',
            textDecoration: 'none',
            display: 'inline-block',
            margin: '20px 0',
          }}
        >
          Verify Email Address
        </Button>
        <Text style={{ color: '#666', fontSize: '14px' }}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default Component;
    `;
  }

  /**
   * Create a default OTP email template
   */
  getOTPEmailTemplate(): string {
    return `
import { Html, Head, Body, Container, Heading, Text, Code } from '@react-email/components';

const Component = ({ code, expiresIn }) => (
  <Html>
    <Head />
    <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <Heading style={{ color: '#1a1a1a', fontSize: '24px', textAlign: 'center' }}>
          Your Verification Code
        </Heading>
        <Text style={{ color: '#333', fontSize: '16px', lineHeight: '24px', textAlign: 'center' }}>
          Use the code below to verify your identity:
        </Text>
        <Code
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            letterSpacing: '8px',
            textAlign: 'center',
            display: 'block',
            margin: '30px 0',
            color: '#007bff',
          }}
        >
          {code}
        </Code>
        <Text style={{ color: '#666', fontSize: '14px', textAlign: 'center' }}>
          This code will expire in {expiresIn} minutes.
        </Text>
        <Text style={{ color: '#666', fontSize: '14px', textAlign: 'center' }}>
          If you didn't request this code, please ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default Component;
    `;
  }

  /**
   * Create a default invoice email template
   */
  getInvoiceEmailTemplate(): string {
    return `
import { Html, Head, Body, Container, Heading, Text, Section, Row, Column, Button } from '@react-email/components';

const Component = ({ invoiceNumber, amount, dueDate, items, customer }) => (
  <Html>
    <Head />
    <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' }}>
      <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <Heading style={{ color: '#1a1a1a', fontSize: '24px' }}>
          Invoice #{invoiceNumber}
        </Heading>
        <Text style={{ color: '#333', fontSize: '16px' }}>
          Dear {customer.name},
        </Text>
        <Text style={{ color: '#333', fontSize: '16px' }}>
          Thank you for your business. Here's your invoice:
        </Text>
        
        <Section style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          {items.map((item, index) => (
            <Row key={index} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
              <Column>{item.description}</Column>
              <Column align="right">${item.amount.toFixed(2)}</Column>
            </Row>
          ))}
          <Row style={{ padding: '20px 0', fontWeight: 'bold' }}>
            <Column>Total Amount</Column>
            <Column align="right">${amount.toFixed(2)}</Column>
          </Row>
        </Section>
        
        <Text style={{ color: '#666', fontSize: '14px', marginTop: '20px' }}>
          Due Date: {new Date(dueDate).toLocaleDateString()}
        </Text>
        
        <Button
          href="#"
          style={{
            backgroundColor: '#007bff',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '4px',
            textDecoration: 'none',
            display: 'inline-block',
            marginTop: '20px',
          }}
        >
          Pay Now
        </Button>
      </Container>
    </Body>
  </Html>
);

export default Component;
    `;
  }
}

export const reactEmailService = new ReactEmailService();