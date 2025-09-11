import type { Express } from "express";
import { createServer, type Server } from "http";

import { storage } from "./storage";
import { db } from "./db";
import { rfqs as rfqsTable, users, rfqAssignments, supplierQuotes, purchaseOrders, salesOrders, companies } from "@shared/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import archiver from "archiver";
import { insertUserSchema, insertRfqSchema, insertFileSchema } from "@shared/schema";
import { emailService } from "./emailService";
import { sendAdminNotification, sendSupplierRfqNotification, sendCustomerQuoteNotification } from "./emailNotifications";



const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Temporary storage for unverified registrations (in production, use Redis or similar)
interface PendingRegistration {
  email: string;
  passwordHash: string;
  name: string;
  company?: string;
  companyId?: string;
  role: string;
  isAdmin: boolean;
  verificationCode: string;
  verificationCodeExpiry: Date;
}

const pendingRegistrations = new Map<string, PendingRegistration>();

// Helper functions
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email: string, verificationCode: string) => {
  try {
    console.log('📧 Sending verification email to:', email);
    const result = await emailService.sendEmail({
      to: email,
      subject: '[S-Hub] Verify your account - Code inside',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">S-Hub by Stoneflake</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Manufacturing Portal</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">Email Verification Required</h2>
            <p style="color: #475569; line-height: 1.6;">Welcome! Please verify your email address to complete your S-Hub registration.</p>
            
            <div style="background: white; border: 2px solid #14b8a6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 30px 0; border-radius: 8px; color: #0f766e;">
              ${verificationCode}
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in 10 minutes</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px;">
            <p>If you didn't sign up for S-Hub, please ignore this email.</p>
            <p>© 2025 Stoneflake Manufacturing</p>
          </div>
        </div>
      `,
      text: `Welcome to S-Hub by Stoneflake!
      
Please verify your email address with this code: ${verificationCode}

This code will expire in 10 minutes.

If you didn't sign up for S-Hub, please ignore this email.`
    });
    console.log('📧 Email service result:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    return false;
  }
};

// Multer configuration for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.step', '.stp', '.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only STEP, PDF, JPG, PNG, and Excel files are allowed'));
    }
  },
});

// Separate multer configuration for STEP conversion (memory storage)
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.step', '.stp'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only STEP files are allowed for conversion'));
    }
  },
});

// JWT middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // Use the token as-is, no cleaning
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await storage.getUser(decoded.id || decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    console.error('Token length:', token?.length || 0);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user?.isAdmin && req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Supplier middleware
const requireSupplier = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'supplier') {
    return res.status(403).json({ message: 'Supplier access required' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Test endpoint to check auth status
  app.get('/api/auth/test', authenticateToken, (req, res) => {
    res.json({ message: 'Auth working', user: req.user?.email });
  });

  // Production debug endpoint
  app.get('/api/debug/jwt', (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      jwtSecretExists: !!process.env.JWT_SECRET,
      jwtSecretPrefix: process.env.JWT_SECRET?.substring(0, 10),
      timestamp: new Date().toISOString()
    });
  });

  // Health check endpoint
  app.get('/api/healthz', async (req, res) => {
    try {
      // Perform a simple database connectivity check
      const result = await db.execute(sql`SELECT 1 as health_check`);
      res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ 
        status: 'error', 
        database: 'disconnected', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString() 
      });
    }
  });

  // REMOVED: Old STEP conversion endpoint - using new X3D approach instead
  
  // Serve static files from uploads directory with proper headers
  app.use('/uploads', (req, res, next) => {
    // Add CORS headers for all uploads
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    const ext = path.extname(req.path).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
    next();
  }, express.static('uploads'));

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, company, role } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: 'Email, password, and name are required' });
      }

      // Determine if user should be admin (only vineeth@stone-flake.com)
      const isAdmin = email === 'vineeth@stone-flake.com';
      
      // Use provided role or determine based on email and admin status
      const userRole = isAdmin ? 'admin' : (role || 'customer');

      // Check if user already exists with the same email and role
      const existingUser = await storage.getUserByEmailAndRole(email, userRole);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this role' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate verification code
      const verificationCode = generateVerificationCode();
      const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // For admin users, create directly in database (auto-verified)
      if (isAdmin) {
        // Auto-create company if company name provided
        let companyId = null;
        if (company && company.trim()) {
          const companiesCount = await storage.getCompaniesCount();
          const customerNumber = `CU${String(companiesCount + 1).padStart(4, '0')}`;
          
          const newCompany = await storage.createCompany({
            name: company.trim(),
            customerNumber,
          });
          companyId = newCompany.id;
        }

        const user = await storage.createUser({
          email,
          passwordHash,
          name,
          companyId,
          companyNameInput: company,
          role: userRole,
          isAdmin: true,
          isVerified: true,
          verificationCode: null,
          verificationCodeExpiry: null,
        });

        // Send admin notification for new admin signup
        try {
          await sendAdminNotification({
            type: 'signup',
            userEmail: user.email,
            userName: user.name,
            userRole: user.role,
            company: company || undefined,
          });
        } catch (error) {
          console.error('Failed to send admin notification for admin signup:', error);
          // Don't fail registration if email notification fails
        }

        return res.json({
          message: 'Admin account created successfully',
          email: user.email,
          requiresVerification: false,
        });
      }

      // For regular users, store in pending registrations until email verification
      const pendingKey = `${email}_${userRole}`;
      
      // Auto-create company if company name provided
      let companyId = null;
      
      if (company && company.trim()) {
        const companiesCount = await storage.getCompaniesCount();
        const customerNumber = `CU${String(companiesCount + 1).padStart(4, '0')}`;
        
        const newCompany = await storage.createCompany({
          name: company.trim(),
          customerNumber,
        });
        companyId = newCompany.id;
      }

      // Store pending registration
      pendingRegistrations.set(pendingKey, {
        email,
        passwordHash,
        name,
        company,
        companyId,
        role: userRole,
        isAdmin: false,
        verificationCode,
        verificationCodeExpiry: verificationExpiry,
      });

      // Send verification email
      console.log('Attempting to send verification email to:', email, 'with code:', verificationCode);
      const emailSent = await sendVerificationEmail(email, verificationCode);
      console.log('Email send result:', emailSent);
      
      if (!emailSent) {
        console.error('Failed to send verification email to:', email);
        return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
      }

      res.json({
        message: 'Registration successful! Please check your email for verification code.',
        email: email,
        requiresVerification: true,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: 'Registration failed' });
    }
  });

  // Temporary manual verification endpoint for testing
  app.post('/api/auth/manual-verify', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: 'Email and role are required' });
      }

      // Check if user is in pending registrations
      const pendingKey = `${email}_${role}`;
      const pendingRegistration = pendingRegistrations.get(pendingKey);
      
      if (!pendingRegistration) {
        return res.status(400).json({ message: 'Registration not found in pending list' });
      }

      // Create user in database now that email is manually verified
      const user = await storage.createUser({
        email: pendingRegistration.email,
        passwordHash: pendingRegistration.passwordHash,
        name: pendingRegistration.name,
        companyId: pendingRegistration.companyId,
        companyNameInput: pendingRegistration.company,
        role: pendingRegistration.role,
        isAdmin: pendingRegistration.isAdmin,
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      });

      // Remove from pending registrations
      pendingRegistrations.delete(pendingKey);

      // Send admin notification for new user signup
      try {
        await sendAdminNotification({
          type: 'signup',
          userEmail: user.email,
          userName: user.name,
          userRole: user.role,
          company: pendingRegistration.company || undefined,
        });
      } catch (error) {
        console.error('Failed to send admin notification for signup:', error);
        // Don't fail verification if email notification fails
      }

      res.json({
        message: 'User manually verified and created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Manual verification error:', error);
      res.status(500).json({ message: 'Failed to manually verify user' });
    }
  });

  // Email verification endpoint
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const { email, verificationCode, role } = req.body;

      if (!email || !verificationCode || !role) {
        return res.status(400).json({ message: 'Email, verification code, and role are required' });
      }

      // Look for pending registration
      const pendingKey = `${email}_${role}`;
      const pendingRegistration = pendingRegistrations.get(pendingKey);
      
      console.log('Verification attempt:', { email, role, pendingKey });
      console.log('Available pending registrations:', Array.from(pendingRegistrations.keys()));
      console.log('Found registration:', !!pendingRegistration);
      
      if (!pendingRegistration) {
        return res.status(400).json({ message: 'Registration not found or already verified' });
      }

      if (pendingRegistration.verificationCode !== verificationCode) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      if (new Date() > pendingRegistration.verificationCodeExpiry) {
        // Remove expired registration
        pendingRegistrations.delete(pendingKey);
        return res.status(400).json({ message: 'Verification code has expired. Please register again.' });
      }

      // Create user in database now that email is verified
      const user = await storage.createUser({
        email: pendingRegistration.email,
        passwordHash: pendingRegistration.passwordHash,
        name: pendingRegistration.name,
        companyId: pendingRegistration.companyId,
        companyNameInput: pendingRegistration.company,
        role: pendingRegistration.role,
        isAdmin: pendingRegistration.isAdmin,
        isVerified: true, // Already verified through email
        verificationCode: null,
        verificationCodeExpiry: null,
      });

      // Send admin notification for new signup
      try {
        await sendAdminNotification({
          type: 'signup',
          userEmail: user.email,
          userName: user.name,
          userRole: user.role,
          company: pendingRegistration.company || undefined,
        });
      } catch (error) {
        console.error('Failed to send admin notification for signup:', error);
        // Don't fail registration if email notification fails
      }

      // Remove from pending registrations
      pendingRegistrations.delete(pendingKey);
      
      res.json({ 
        message: 'Email verified successfully! Your account has been created.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'Verification failed' });
    }
  });

  // Admin endpoint to get verification code for debugging
  app.get('/api/admin/user/:email/verification-code', async (req, res) => {
    try {
      const { email } = req.params;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ 
        verificationCode: user.verificationCode,
        isVerified: user.isVerified,
        codeExpiry: user.verificationCodeExpiry
      });
    } catch (error) {
      console.error('Get verification code error:', error);
      res.status(500).json({ message: 'Failed to get verification code' });
    }
  });

  // Admin endpoint to manually verify a user
  app.post('/api/admin/user/:email/verify', async (req, res) => {
    try {
      const { email } = req.params;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.isVerified) {
        return res.json({ message: 'User is already verified' });
      }
      
      // Manually verify the user
      await storage.updateUserVerificationStatus(email, true);
      
      res.json({ message: 'User verified successfully' });
    } catch (error) {
      console.error('Manual verification error:', error);
      res.status(500).json({ message: 'Failed to verify user' });
    }
  });

  // Resend verification code endpoint
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: 'Email and role are required' });
      }

      // Check if user is in pending registrations (new signups)
      const pendingKey = `${email}_${role}`;
      const pendingRegistration = pendingRegistrations.get(pendingKey);
      
      if (pendingRegistration) {
        // Generate new verification code for pending registration
        const verificationCode = generateVerificationCode();
        const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update pending registration with new code
        pendingRegistration.verificationCode = verificationCode;
        pendingRegistration.verificationCodeExpiry = verificationExpiry;
        pendingRegistrations.set(pendingKey, pendingRegistration);

        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationCode);
        
        if (!emailSent) {
          console.error('Failed to send verification email to:', email);
          return res.status(500).json({ message: 'Failed to send verification email' });
        }

        return res.json({ message: 'Verification code sent successfully' });
      }

      // Check if user exists in database (for already created but unverified users)
      const user = await storage.getUserByEmailAndRole(email, role);
      if (!user) {
        return res.status(400).json({ message: 'Registration not found. Please sign up first.' });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: 'Email already verified' });
      }

      // Generate new verification code
      const verificationCode = generateVerificationCode();
      const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update user with new code
      await storage.updateUserVerificationCode(email, verificationCode, verificationExpiry);

      // Send verification email
      const emailSent = await sendVerificationEmail(email, verificationCode);
      
      if (!emailSent) {
        console.error('Failed to send verification email to:', email);
        return res.status(500).json({ message: 'Failed to send verification email' });
      }

      res.json({ message: 'Verification code sent successfully' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: 'Failed to resend verification code' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, role } = req.body;



      // Find user by email and role
      const userRole = role || 'customer'; // Default to customer if no role specified
      let user = await storage.getUserByEmailAndRole(email, userRole);
      
      // If not found and looking for customer, check if this is an admin user
      if (!user && userRole === 'customer') {
        const adminUser = await storage.getUserByEmailAndRole(email, 'admin');
        if (adminUser && adminUser.isAdmin) {
          user = adminUser;
        }
      }
      
      if (!user) {
        console.log('❌ User not found for role:', email, userRole);
        return res.status(400).json({ message: 'Invalid credentials' });
      }



      // Check if user is verified
      if (!user.isVerified) {
        console.log('❌ User not verified:', email);
        return res.status(400).json({ 
          message: 'Please verify your email before signing in',
          requiresVerification: true 
        });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.passwordHash);

      
      if (!validPassword) {
        console.log('❌ Password invalid for:', email);
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check if user must reset password (admin-created accounts)
      if (user.mustResetPassword) {
        console.log('🔒 User must reset password:', email);
        return res.status(200).json({ 
          requiresPasswordReset: true,
          message: 'Password reset required for first-time login',
          userId: user.id 
        });
      }

      // Generate JWT
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          isAdmin: user.isAdmin,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(400).json({ message: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      // Fetch complete user data from storage
      const fullUser = await storage.getUser(req.user.id);
      if (!fullUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Fetch current company information if user has a company
      let companyInfo = null;
      if (fullUser.companyId) {
        const company = await storage.getCompanyById(fullUser.companyId);
        if (company) {
          companyInfo = {
            companyName: company.name,
            companyNameInput: company.name,
            customerNumber: company.companyNumber || 'V0000',  // For suppliers
          };
        }
      }

      res.json({
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        company: companyInfo?.companyName || fullUser.company,
        companyName: companyInfo?.companyName || fullUser.company,
        companyNameInput: companyInfo?.companyNameInput || fullUser.companyNameInput,
        customerNumber: companyInfo?.customerNumber || fullUser.customerNumber,
        userNumber: fullUser.userNumber,
        isAdmin: fullUser.isAdmin,
        role: fullUser.role,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  // Password reset request endpoint
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: 'Email and role are required' });
      }

      // Check if user exists with this email and role
      const user = await storage.getUserByEmailAndRole(email, role);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
      }

      // Generate reset code
      const resetCode = generateResetCode();
      const resetExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save reset code to database
      await storage.updateUserResetCode(email, role, resetCode, resetExpiry);

      // Send reset email
      const emailSent = await emailService.sendPasswordResetEmail(email, resetCode, role);
      
      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to send reset email' });
      }

      res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  // Password reset verification and update endpoint
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, role, resetCode, newPassword } = req.body;

      if (!email || !role || !resetCode || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Verify reset code
      const isValidCode = await storage.verifyResetCode(email, role, resetCode);
      if (!isValidCode) {
        return res.status(400).json({ message: 'Invalid or expired reset code' });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset code
      await storage.resetForgottenPassword(email, role, passwordHash);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Admin-created account password reset endpoint (first-time login)
  app.post('/api/auth/admin-password-reset', async (req, res) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;

      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'User ID, current password, and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Get user and verify it's admin-created and requires password reset
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      if (!user.isAdminCreated || !user.mustResetPassword) {
        return res.status(400).json({ message: 'Password reset not required for this account' });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      console.log('🔧 Route: Hashed new password preview:', passwordHash.substring(0, 20) + '...');

      // Update password and clear reset requirement
      console.log('🔧 About to reset password for admin-created user:', userId);
      await storage.resetAdminCreatedUserPassword(userId, passwordHash);
      console.log('✅ Password reset completed for admin-created user:', userId);

      // Verify the flag was actually cleared
      const updatedUser = await storage.getUser(userId);
      console.log('🔍 After reset - mustResetPassword flag:', updatedUser?.mustResetPassword);

      // Generate JWT for immediate login
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({ 
        message: 'Password reset successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          isAdmin: user.isAdmin,
          role: user.role,
        }
      });
    } catch (error) {
      console.error('Admin password reset error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // RFQ routes
  // Admin endpoint to assign reference number to RFQ when sending to suppliers
  app.post('/api/admin/rfqs/:rfqId/assign-sqte', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { rfqId } = req.params;
      const { useExisting, sqteNumber } = req.body;
      
      let finalSqteNumber = sqteNumber;
      
      if (!useExisting) {
        // Generate new SQTE number
        finalSqteNumber = await storage.generateSqteNumber();
      }
      
      // Assign SQTE number to the RFQ
      await storage.assignSqteNumber(rfqId, finalSqteNumber);
      
      res.json({ 
        success: true, 
        sqteNumber: finalSqteNumber,
        message: 'SQTE number assigned successfully' 
      });
    } catch (error) {
      console.error('Assign SQTE number error:', error);
      res.status(500).json({ message: 'Failed to assign SQTE number' });
    }
  });

  app.get('/api/rfqs', authenticateToken, async (req: any, res) => {
    try {
      const rfqs = await storage.getRFQsByUserId(req.user.id);
      res.json(rfqs);
    } catch (error) {
      console.error('Get RFQs error:', error);
      res.status(500).json({ message: 'Failed to fetch RFQs' });
    }
  });

  app.post('/api/rfqs', authenticateToken, async (req: any, res) => {
    try {
      const rfqData = insertRfqSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const rfq = await storage.createRFQ(rfqData);

      // Send admin notification for new RFQ submission
      try {
        await sendAdminNotification({
          type: 'rfq_submission',
          userEmail: req.user.email,
          userName: req.user.name,
          company: req.user.company,
          rfqDetails: {
            projectName: rfq.projectName,
            material: rfq.material,
            quantity: rfq.quantity,
            manufacturingProcess: rfq.manufacturingProcess,
          },
        });
      } catch (error) {
        console.error('Failed to send admin notification for RFQ submission:', error);
        // Don't fail RFQ creation if email notification fails
      }

      res.json(rfq);
    } catch (error) {
      console.error('Create RFQ error:', error);
      res.status(400).json({ message: 'Failed to create RFQ' });
    }
  });

  app.get('/api/rfqs/:id', authenticateToken, async (req: any, res) => {
    try {
      const rfq = await storage.getRFQById(req.params.id);
      if (!rfq) {
        return res.status(404).json({ message: 'RFQ not found' });
      }

      // Check ownership or admin
      if (rfq.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const files = await storage.getFilesByRFQId(rfq.id);
      res.json({ ...rfq, files });
    } catch (error) {
      console.error('Get RFQ error:', error);
      res.status(500).json({ message: 'Failed to fetch RFQ' });
    }
  });



  // File upload routes
  app.post('/api/files/upload', authenticateToken, upload.array('files'), async (req: any, res) => {
    try {
      const { linkedToType, linkedToId } = req.body;
      const uploadedFiles = [];

      for (const file of req.files) {
        const fileExt = path.extname(file.originalname).toLowerCase();
        let fileType: "step" | "pdf" | "excel" | "image" = 'pdf';
        if (['.step', '.stp'].includes(fileExt)) {
          fileType = 'step';
        } else if (['.xlsx', '.xls'].includes(fileExt)) {
          fileType = 'excel';
        } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
          fileType = 'image';
        }
        


        const fileRecord = await storage.createFile({
          userId: req.user.id,
          fileName: file.originalname,
          fileUrl: file.path,
          fileSize: file.size,
          fileType,
          linkedToType,
          linkedToId,
        });

        // If it's a STEP file, trigger conversion to XKT
        if (fileType === 'step') {
          try {
            const conversionResult = await stepConverter.convertStepToXkt(file.path, file.originalname);
            
            if (conversionResult.success && conversionResult.xktPath) {
              // Store XKT path in file record for immediate preview
              await storage.updateFile(fileRecord.id, {
                glbPath: conversionResult.xktPath  // Reuse glbPath field for XKT path
              });
              
              // Add XKT path to response for immediate frontend use
              fileRecord.glbPath = conversionResult.xktPath;
            } else {
              console.warn(`STEP to XKT conversion failed for ${file.originalname}:`, conversionResult.error);
            }
          } catch (conversionError) {
            console.error(`STEP conversion error for ${file.originalname}:`, conversionError);
          }
        }

        uploadedFiles.push(fileRecord);
      }

      res.json(uploadedFiles);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'File upload failed' });
    }
  });

  // Admin bulk quote file upload - temporary files without linking to entities
  app.post('/api/admin/files/upload', authenticateToken, upload.array('files'), async (req: any, res) => {
    try {
      // Only allow admin users
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        const fileExt = path.extname(file.originalname).toLowerCase();
        let fileType: "step" | "pdf" | "excel" | "image" = 'pdf';
        if (['.step', '.stp'].includes(fileExt)) {
          fileType = 'step';
        } else if (['.xlsx', '.xls'].includes(fileExt)) {
          fileType = 'excel';
        } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
          fileType = 'image';
        }

        // Create file record with temporary linking for bulk quotes
        const fileRecord = await storage.createFile({
          userId: req.user.id,
          fileName: file.originalname,
          fileUrl: file.path,
          fileSize: file.size,
          fileType,
          linkedToType: 'rfq', // Use 'rfq' as a default for now
          linkedToId: 'temp-bulk-quote', // Temporary placeholder
        });

        uploadedFiles.push(fileRecord);
      }

      res.json(uploadedFiles);
    } catch (error) {
      console.error('Admin bulk quote file upload error:', error);
      res.status(500).json({ message: 'File upload failed' });
    }
  });

  // REMOVED: Old STEP-XKT conversion endpoint - using new X3D approach instead



  app.get('/api/files/:id/download', authenticateToken, async (req: any, res) => {
    try {
      const file = await storage.getFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Authorization logic:
      // 1. File owner can download
      // 2. Admin can download any file
      // 3. Suppliers can download files from RFQs assigned to them
      let hasAccess = false;
      
      if (file.userId === req.user.id || req.user.isAdmin) {
        hasAccess = true;
      } else if (req.user.role === 'supplier' && file.linkedToType === 'rfq') {
        // Check if supplier is assigned to this RFQ
        const assignedRfqs = await storage.getAssignedRfqsBySupplierId(req.user.id);
        const isAssignedToRfq = assignedRfqs.some(assignment => assignment.rfq.id === file.linkedToId);
        hasAccess = isAssignedToRfq;
      } else if (req.user.role === 'customer' && file.linkedToType === 'rfq') {
        // Check if customer owns this RFQ
        const rfq = await storage.getRFQById(file.linkedToId);
        if (rfq && (rfq.userId === req.user.id || 
            (rfq.user?.companyId && req.user.companyId && rfq.user.companyId === req.user.companyId))) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!fs.existsSync(file.fileUrl)) {
        return res.status(404).json({ message: 'File not found on disk' });
      }

      res.download(file.fileUrl, file.fileName);
    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({ message: 'File download failed' });
    }
  });

  // Order routes
  app.get('/api/orders', authenticateToken, async (req: any, res) => {
    try {
      const orders = await storage.getOrdersByUserId(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Admin routes
  app.get('/api/admin/rfqs', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const rfqs = await storage.getAllRFQs();
      res.json(rfqs);
    } catch (error) {
      console.error('Get admin RFQs error:', error);
      res.status(500).json({ message: 'Failed to fetch RFQs' });
    }
  });

  // Get customer-submitted RFQs only (for Customer Management)
  app.get('/api/admin/customer-rfqs', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      // Get RFQs that were created by actual customers (not admin)
      const allRfqs = await db
        .select()
        .from(rfqsTable)
        .innerJoin(users, eq(rfqsTable.userId, users.id))
        .where(eq(users.role, 'customer'))
        .orderBy(desc(rfqsTable.createdAt));

      const customerRfqs = allRfqs.map(result => ({
        ...result.rfqs,
        user: result.users
      }));

      res.json(customerRfqs);
    } catch (error) {
      console.error('Get customer RFQs error:', error);
      res.status(500).json({ message: 'Failed to fetch customer RFQs' });
    }
  });

  app.patch('/api/admin/rfqs/:id/status', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      await storage.updateRFQStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      console.error('Update RFQ status error:', error);
      res.status(500).json({ message: 'Failed to update RFQ status' });
    }
  });

  // Get files for a specific RFQ (for admin portal)
  app.get('/api/admin/rfqs/:id/files', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const files = await storage.getFilesByRFQId(req.params.id);
      res.json(files);
    } catch (error) {
      console.error('Get RFQ files error:', error);
      res.status(500).json({ message: 'Failed to fetch RFQ files' });
    }
  });

  // Quote routes
  app.get('/api/admin/quotes', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const quotes = await storage.getAllQuotes();
      res.json(quotes);
    } catch (error) {
      console.error('Get all quotes error:', error);
      res.status(500).json({ message: 'Failed to fetch quotes' });
    }
  });

  app.get('/api/admin/rfqs/:id/quote', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const quote = await storage.getQuoteByRFQId(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      res.json(quote);
    } catch (error) {
      console.error('Get quote error:', error);
      res.status(500).json({ message: 'Failed to fetch quote' });
    }
  });

  app.post('/api/admin/rfqs/:id/quote', authenticateToken, requireAdmin, upload.single('quoteFile'), async (req: any, res) => {
    try {
      const { amount, validUntil, estimatedDeliveryDate, notes } = req.body;
      
      // Validate required fields
      if (!amount || !validUntil) {
        return res.status(400).json({ message: 'Amount and valid until date are required' });
      }
      
      let quoteFileUrl = null;
      if (req.file) {
        quoteFileUrl = req.file.path;
      }

      const quote = await storage.createQuote({
        rfqId: req.params.id,
        quoteNumber: '', // Will be generated in storage layer
        amount: amount.toString(),
        validUntil: new Date(validUntil),
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
        quoteFileUrl,
        notes: notes || null,
      });

      // Update RFQ status to quoted
      await storage.updateRFQStatus(req.params.id, 'quoted');

      res.json({ success: true, quote });
    } catch (error) {
      console.error('Create quote error:', error);
      
      // Provide more specific error messages
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({ message: 'RFQ not found' });
      }
      
      res.status(500).json({ message: 'Failed to create quote. Please try again.' });
    }
  });

  // Create order from approved quote
  app.post('/api/admin/rfqs/:id/create-order', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { dueDate, customerPurchaseOrderNumber } = req.body;
      console.log('Creating order for RFQ:', req.params.id, 'with data:', { dueDate, customerPurchaseOrderNumber });
      
      // Check if order already exists for this RFQ
      const existingOrder = await storage.getOrderByRFQId(req.params.id);
      if (existingOrder) {
        return res.status(400).json({ message: 'Order already exists for this RFQ' });
      }

      const rfq = await storage.getRFQById(req.params.id);
      if (!rfq) {
        return res.status(400).json({ message: 'RFQ not found' });
      }

      // Get the quote for this RFQ
      const quote = await storage.getQuoteByRFQId(req.params.id);
      if (!quote) {
        return res.status(400).json({ message: 'Quote not found. Please create a quote first.' });
      }

      // Use provided due date or default to 30 days from now
      const orderDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Generate order number automatically in storage
      const order = await storage.createOrder({
        rfqId: req.params.id,
        quoteId: quote.id,
        userId: rfq.userId,
        projectName: rfq.projectName,
        material: rfq.material,
        materialGrade: rfq.materialGrade,
        finishing: rfq.finishing,
        tolerance: rfq.tolerance,
        quantity: rfq.quantity,
        notes: rfq.notes,
        amount: quote.amount,
        currency: quote.currency || 'USD',
        orderStatus: 'pending',
        orderNumber: '', // Will be generated in storage layer
        estimatedCompletion: orderDueDate,
        customerPurchaseOrderNumber: customerPurchaseOrderNumber || null,
      });

      console.log('Order created successfully:', order);
      res.json({ success: true, order });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ message: 'Failed to create order: ' + error.message });
    }
  });

  // Check if order exists for RFQ (admin only)
  app.get('/api/admin/rfqs/:id/order', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const existingOrder = await storage.getOrderByRFQId(req.params.id);
      res.json({ 
        hasOrder: !!existingOrder, 
        order: existingOrder,
        orderNumber: existingOrder?.orderNumber || null
      });
    } catch (error) {
      console.error('Check order error:', error);
      res.status(500).json({ message: 'Failed to check order status' });
    }
  });

  // Customer quote routes
  app.get('/api/rfqs/:id/quote', authenticateToken, async (req: any, res) => {
    try {
      const rfq = await storage.getRFQById(req.params.id);
      if (!rfq) {
        return res.status(404).json({ message: 'RFQ not found' });
      }

      // Check ownership
      if (rfq.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const quote = await storage.getQuoteByRFQId(req.params.id);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      res.json(quote);
    } catch (error) {
      console.error('Get customer quote error:', error);
      res.status(500).json({ message: 'Failed to fetch quote' });
    }
  });

  app.get('/api/quotes/:id/download', authenticateToken, async (req: any, res) => {
    try {
      const quote = await storage.getQuoteByRFQId(req.params.id);
      if (!quote || !quote.quoteFileUrl) {
        return res.status(404).json({ message: 'Quote file not found' });
      }

      // Check if user has access to this quote
      const rfq = await storage.getRFQById(quote.rfqId);
      if (!rfq) {
        return res.status(404).json({ message: 'RFQ not found' });
      }

      if (rfq.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!fs.existsSync(quote.quoteFileUrl)) {
        return res.status(404).json({ message: 'File not found on disk' });
      }

      res.download(quote.quoteFileUrl, 'quote.pdf');
    } catch (error) {
      console.error('Quote download error:', error);
      res.status(500).json({ message: 'Quote download failed' });
    }
  });

  // Quote response routes
  app.post('/api/rfqs/:id/quote/respond', authenticateToken, upload.single('purchaseOrder'), async (req: any, res) => {
    try {
      const { status, response } = req.body;
      
      // Verify the RFQ belongs to the user
      const rfq = await storage.getRFQById(req.params.id);
      if (!rfq) {
        return res.status(404).json({ message: 'RFQ not found' });
      }

      if (rfq.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      let purchaseOrderUrl = null;
      if (req.file) {
        purchaseOrderUrl = req.file.path;
      }

      // Convert frontend status to backend status
      const backendStatus = status === 'accept' ? 'accepted' : 'declined';
      await storage.respondToQuote(req.params.id, backendStatus, response, purchaseOrderUrl);

      res.json({ success: true, message: `Quote ${status} successfully` });
    } catch (error) {
      console.error('Quote response error:', error);
      res.status(500).json({ message: 'Failed to respond to quote' });
    }
  });

  // Purchase Order upload endpoint
  app.post('/api/quotes/:quoteId/purchase-order', authenticateToken, upload.single('purchaseOrder'), async (req: any, res) => {
    try {
      const { quoteId } = req.params;
      const { purchaseOrderNumber } = req.body;
      const userId = req.user?.id;
      
      if (!req.file) {
        return res.status(400).json({ message: 'Purchase order file is required' });
      }

      if (!purchaseOrderNumber) {
        return res.status(400).json({ message: 'Purchase order number is required' });
      }

      // Verify the quote belongs to this user
      const quote = await storage.getQuoteById(quoteId);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      const rfq = await storage.getRFQById(quote.rfqId);
      if (!rfq || rfq.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Update the quote with PO file URL and number
      await storage.updateQuote(quoteId, {
        purchaseOrderUrl: req.file.path,
        purchaseOrderNumber: purchaseOrderNumber
      });

      res.json({ 
        message: 'Purchase order uploaded successfully',
        purchaseOrderUrl: req.file.path,
        purchaseOrderNumber: purchaseOrderNumber
      });
    } catch (error) {
      console.error('PO upload error:', error);
      res.status(500).json({ message: 'Failed to upload purchase order' });
    }
  });

  // Purchase Order download endpoint (customer)
  app.get('/api/quotes/:quoteId/purchase-order/download', authenticateToken, async (req: any, res) => {
    try {
      const { quoteId } = req.params;
      const userId = req.user?.id;

      // Verify the quote belongs to this user
      const quote = await storage.getQuoteById(quoteId);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      const rfq = await storage.getRFQById(quote.rfqId);
      if (!rfq || rfq.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!quote.purchaseOrderUrl) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }

      const filePath = path.join(process.cwd(), quote.purchaseOrderUrl);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Purchase order file not found' });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PO-${quote.purchaseOrderNumber || quote.rfqId.slice(0, 8)}.pdf"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('PO download error:', error);
      res.status(500).json({ message: 'Failed to download purchase order' });
    }
  });

  // Purchase Order download endpoint (admin only)
  app.get('/api/admin/quotes/:quoteId/purchase-order/download', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { quoteId } = req.params;
      
      const quote = await storage.getQuoteById(quoteId);
      if (!quote || !quote.purchaseOrderUrl) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }

      const filePath = path.join(process.cwd(), quote.purchaseOrderUrl);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Purchase order file not found' });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PO-${quote.rfqId.slice(0, 8)}.pdf"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('PO download error:', error);
      res.status(500).json({ message: 'Failed to download purchase order' });
    }
  });

  // Order status update route (admin only)
  app.patch('/api/orders/:id/status', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      await storage.updateOrderStatus(req.params.id, status);

      res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
      console.error('Order status update error:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });

  // Order tracking number update route (admin only)
  app.patch('/api/orders/:id/tracking', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { trackingNumber, shippingCarrier } = req.body;
      await storage.updateOrderTracking(req.params.id, trackingNumber, shippingCarrier);

      res.json({ success: true, message: 'Tracking information updated successfully' });
    } catch (error) {
      console.error('Tracking information update error:', error);
      res.status(500).json({ message: 'Failed to update tracking information' });
    }
  });

  // Create reorder from existing order
  app.post('/api/orders/:id/reorder', authenticateToken, async (req: any, res) => {
    try {
      const orderId = req.params.id;
      
      // Get the original order
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check ownership
      if (order.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Check if order is completed/archived (allow reorders for orders in final stages)
      if (!order.isArchived && !['delivered', 'shipped', 'packing'].includes(order.orderStatus || '')) {
        return res.status(400).json({ message: 'Can only reorder orders that are shipped, packed, delivered, or archived' });
      }

      // Get the original RFQ to copy its details
      const originalRfq = await storage.getRFQById(order.rfqId);
      if (!originalRfq) {
        return res.status(404).json({ message: 'Original RFQ not found' });
      }

      // Create a new RFQ as a reorder (using project name prefix to identify reorders)
      const reorderRfq = await storage.createRFQ({
        userId: req.user.id,
        projectName: `REORDER: ${originalRfq.projectName}`,
        material: originalRfq.material,
        materialGrade: originalRfq.materialGrade,
        finishing: originalRfq.finishing,
        tolerance: originalRfq.tolerance,
        quantity: originalRfq.quantity,
        notes: `Reorder of Order #${order.orderNumber || order.id.slice(0, 8)}. Original Order ID: ${orderId}. Original notes: ${originalRfq.notes || 'None'}`,
        manufacturingProcess: originalRfq.manufacturingProcess,
        manufacturingSubprocess: originalRfq.manufacturingSubprocess,
        internationalManufacturingOk: originalRfq.internationalManufacturingOk,
      });

      // Copy any files from the original RFQ to the new reorder RFQ
      const originalFiles = await storage.getFilesByLinkedId(originalRfq.id, 'rfq');
      for (const file of originalFiles) {
        // Create a copy of the file linked to the new RFQ
        await storage.createFile({
          userId: req.user.id,
          fileName: `REORDER_${file.fileName}`,
          fileUrl: file.fileUrl, // Reference the same physical file

          fileSize: file.fileSize,
          fileType: file.fileType,
          linkedToType: 'rfq',
          linkedToId: reorderRfq.id,
        });
      }

      res.json({
        message: 'Reorder request created successfully',
        rfq: reorderRfq,
        originalOrder: order
      });
    } catch (error) {
      console.error('Create reorder error:', error);
      res.status(500).json({ message: 'Failed to create reorder' });
    }
  });

  // Order invoice upload route (admin only)
  app.patch('/api/orders/:id/invoice', authenticateToken, requireAdmin, upload.single('invoice'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Invoice file is required' });
      }

      // Validate file type - must be PDF
      const originalExt = path.extname(req.file.originalname).toLowerCase();
      if (originalExt !== '.pdf') {
        // Remove the uploaded file if it's not a PDF
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Failed to remove invalid file:', e);
        }
        return res.status(400).json({ message: 'Only PDF files are allowed for invoices' });
      }

      // Additional validation: check if file content is actually a PDF
      const fileBuffer = fs.readFileSync(req.file.path);
      const isPDF = fileBuffer.toString('utf8', 0, 4) === '%PDF';
      
      if (!isPDF) {
        // Remove the uploaded file if it's not actually a PDF
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Failed to remove invalid file:', e);
        }
        return res.status(400).json({ message: 'File content is not a valid PDF' });
      }
      
      const invoiceUrl = `/uploads/${path.basename(req.file.path)}`;
      await storage.updateOrderInvoice(req.params.id, invoiceUrl);

      res.json({ success: true, message: 'Invoice uploaded successfully', invoiceUrl });
    } catch (error) {
      console.error('Invoice upload error:', error);
      res.status(500).json({ message: 'Failed to upload invoice' });
    }
  });

  // Order payment status update route (admin only)
  app.patch('/api/orders/:id/payment', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { paymentStatus } = req.body;
      await storage.updateOrderPaymentStatus(req.params.id, paymentStatus);

      // If marked as paid, automatically archive the order
      if (paymentStatus === 'paid') {
        await storage.archiveOrder(req.params.id);
      }

      res.json({ success: true, message: 'Payment status updated successfully' });
    } catch (error) {
      console.error('Payment status update error:', error);
      res.status(500).json({ message: 'Failed to update payment status' });
    }
  });

  // Record partial shipment with detailed tracking
  app.post('/api/orders/:id/shipments', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { quantityShipped, trackingNumber, shippingCarrier, notes } = req.body;
      
      if (!quantityShipped || quantityShipped <= 0) {
        return res.status(400).json({ message: 'Valid quantity is required' });
      }

      const result = await storage.recordPartialShipment(
        req.params.id, 
        quantityShipped, 
        trackingNumber, 
        shippingCarrier
      );

      res.json({ success: true, shipment: result.shipment, order: result.order });
    } catch (error: any) {
      console.error('Record shipment error:', error);
      res.status(500).json({ message: error.message || 'Failed to record shipment' });
    }
  });

  // Get shipments for an order
  app.get('/api/orders/:id/shipments', authenticateToken, async (req: any, res) => {
    try {
      const shipments = await storage.getShipmentsByOrderId(req.params.id);
      res.json(shipments);
    } catch (error) {
      console.error('Get shipments error:', error);
      res.status(500).json({ message: 'Failed to fetch shipments' });
    }
  });

  // Update shipment status (mark as delivered)
  app.patch('/api/shipments/:id/status', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { status, deliveryDate } = req.body;
      
      if (!['shipped', 'delivered'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const shipment = await storage.updateShipmentStatus(
        req.params.id, 
        status, 
        deliveryDate ? new Date(deliveryDate) : undefined
      );

      res.json({ success: true, shipment });
    } catch (error) {
      console.error('Update shipment status error:', error);
      res.status(500).json({ message: 'Failed to update shipment status' });
    }
  });

  // Update shipment tracking status (independent manufacturing stages)
  app.patch('/api/shipments/:id/tracking-status', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { trackingStatus } = req.body;

      const validStatuses = [
        'material_procurement', 
        'manufacturing', 
        'finishing', 
        'quality_check', 
        'packing', 
        'shipped', 
        'delivered'
      ];

      if (!validStatuses.includes(trackingStatus)) {
        return res.status(400).json({ message: 'Invalid tracking status' });
      }

      const shipment = await storage.updateShipmentTrackingStatus(req.params.id, trackingStatus);

      res.json({ success: true, shipment });
    } catch (error: any) {
      console.error('Update shipment tracking status error:', error);
      res.status(500).json({ message: error.message || 'Failed to update shipment tracking status' });
    }
  });

  // Get archived orders route (admin only)
  app.get('/api/admin/orders/archived', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const archivedOrders = await storage.getArchivedOrders();
      res.json(archivedOrders);
    } catch (error) {
      console.error('Get archived orders error:', error);
      res.status(500).json({ message: 'Failed to get archived orders' });
    }
  });

  // Reopen archived order (admin only)
  app.patch('/api/admin/orders/:id/reopen', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      await storage.reopenArchivedOrder(req.params.id);
      res.json({ success: true, message: 'Order reopened successfully' });
    } catch (error: any) {
      console.error('Reopen archived order error:', error);
      res.status(500).json({ message: error.message || 'Failed to reopen order' });
    }
  });

  // Get all orders (admin only)
  app.get('/api/admin/orders', authenticateToken, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error('Get admin orders error:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Check if order exists for RFQ
  app.get('/api/admin/rfqs/:id/order', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const order = await storage.getOrderByRFQId(req.params.id);
      res.json({ hasOrder: !!order, order });
    } catch (error) {
      console.error('Check order existence error:', error);
      res.status(500).json({ message: 'Failed to check order existence' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', authenticateToken, async (req: any, res) => {
    try {
      console.log(`[DEBUG] Dashboard requested for user: ${req.user.id} (${req.user.email})`);
      const userRfqs = await storage.getRFQsByUserId(req.user.id);
      const userOrders = await storage.getOrdersByUserId(req.user.id);
      const userQuotes = await storage.getQuotesByUserId(req.user.id);

      // Get RFQ IDs that have been converted to orders
      const orderRfqIds = new Set(userOrders.map(order => order.rfqId));

      console.log(`[DEBUG] User ${req.user.email}: RFQs=${userRfqs.length}, Orders=${userOrders.length}, Quotes=${userQuotes.length}`);

      const activeRfqs = userRfqs.filter(rfq => 
        ['submitted', 'quoted'].includes(rfq.status || '') && !orderRfqIds.has(rfq.id)
      );

      console.log(`[DEBUG] Active RFQs for ${req.user.email}: ${activeRfqs.length} out of ${userRfqs.length} total`);

      const stats = {
        // Active RFQs are those that haven't been converted to orders yet
        activeRfqs: activeRfqs.length,
        activeOrders: userOrders.filter(order => !['delivered', 'cancelled'].includes(order.orderStatus || '')).length,
        pendingQuotes: userQuotes.filter(quote => quote.status === 'pending').length,
        totalSpent: userOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
      };

      console.log(`[DEBUG] Final stats for ${req.user.email}: ${JSON.stringify(stats)}`);
      res.json(stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Debug endpoint to simulate user RFQ access for testing company data sharing
  app.get('/api/admin/debug/simulate-user-rfqs/:userId', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      console.log(`[DEBUG] Simulating RFQ access for user: ${userId}`);
      
      const rfqs = await storage.getRFQsByUserId(userId);
      console.log(`[DEBUG] Found ${rfqs.length} RFQs for user ${userId}`);
      
      res.json({
        userId,
        rfqCount: rfqs.length,
        rfqs: rfqs.map(rfq => ({
          id: rfq.id,
          projectName: rfq.projectName,
          userId: rfq.userId,
          createdAt: rfq.createdAt
        }))
      });
    } catch (error) {
      console.error('Debug simulate user RFQs error:', error);
      res.status(500).json({ message: 'Debug endpoint failed' });
    }
  });

  // Debug endpoint to check company users
  app.get('/api/admin/debug/company-users/:customerNumber', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { customerNumber } = req.params;
      console.log(`[DEBUG] Checking company users for customer number: ${customerNumber}`);
      
      const companyUsers = await storage.getUsersByCustomerNumber(customerNumber);
      const userIds = companyUsers.map(u => u.id);
      
      console.log(`[DEBUG] Found ${companyUsers.length} users for customer number ${customerNumber}: ${JSON.stringify(userIds)}`);
      
      res.json({
        customerNumber,
        userCount: companyUsers.length,
        users: companyUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          customerNumber: user.customerNumber
        })),
        userIds
      });
    } catch (error) {
      console.error('Debug company users error:', error);
      res.status(500).json({ message: 'Debug endpoint failed' });
    }
  });

  // Debug endpoint to simulate dashboard stats for specific user
  app.post('/api/admin/debug-dashboard-stats', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.body;
      console.log(`[DEBUG] Simulating dashboard stats for user: ${userId}`);
      
      const userRfqs = await storage.getRFQsByUserId(userId);
      const userOrders = await storage.getOrdersByUserId(userId);
      const userQuotes = await storage.getQuotesByUserId(userId);

      // Get RFQ IDs that have been converted to orders
      const orderRfqIds = new Set(userOrders.map(order => order.rfqId));

      console.log(`[DEBUG] User RFQs: ${userRfqs.length}, User Orders: ${userOrders.length}, User Quotes: ${userQuotes.length}`);
      console.log(`[DEBUG] RFQ statuses: ${userRfqs.map(rfq => rfq.status).join(', ')}`);
      console.log(`[DEBUG] Order RFQ IDs: ${Array.from(orderRfqIds).join(', ')}`);

      const activeRfqs = userRfqs.filter(rfq => 
        ['submitted', 'quoted'].includes(rfq.status || '') && !orderRfqIds.has(rfq.id)
      );

      console.log(`[DEBUG] Active RFQs: ${activeRfqs.length} (${activeRfqs.map(rfq => `${rfq.id}:${rfq.status}`).join(', ')})`);

      const stats = {
        // Active RFQs are those that haven't been converted to orders yet
        activeRfqs: activeRfqs.length,
        activeOrders: userOrders.filter(order => !['delivered', 'cancelled'].includes(order.orderStatus || '')).length,
        pendingQuotes: userQuotes.filter(quote => quote.status === 'pending').length,
        totalSpent: userOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
      };

      res.json({ userId, stats, debug: { userRfqs: userRfqs.length, userOrders: userOrders.length, userQuotes: userQuotes.length, orderRfqIds: Array.from(orderRfqIds) }});
    } catch (error) {
      console.error('Debug dashboard stats error:', error);
      res.status(500).json({ message: 'Debug endpoint failed' });
    }
  });

  app.get('/api/admin/dashboard/stats', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const allRfqs = await storage.getAllRFQs();

      const stats = {
        newRfqs: allRfqs.filter(rfq => rfq.status === 'submitted').length,
        pendingReview: allRfqs.filter(rfq => rfq.status === 'quoted').length,
        quotedToday: allRfqs.filter(rfq => 
          rfq.status === 'quoted' && 
          rfq.createdAt && 
          new Date(rfq.createdAt).toDateString() === new Date().toDateString()
        ).length,
        monthlyRevenue: 45230, // Mock value - would calculate from orders
      };

      res.json(stats);
    } catch (error) {
      console.error('Get admin dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
  });

  // Get quotes for current user
  app.get('/api/quotes', authenticateToken, async (req: any, res) => {
    try {
      const quotes = await storage.getQuotesByUserId(req.user.id);
      res.json(quotes);
    } catch (error) {
      console.error('Get user quotes error:', error);
      res.status(500).json({ message: 'Failed to fetch quotes' });
    }
  });

  // Company management routes (admin only)
  app.get('/api/admin/companies', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error('Get companies error:', error);
      res.status(500).json({ message: 'Failed to fetch companies' });
    }
  });

  app.post('/api/admin/companies', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const company = await storage.createCompany(req.body);
      res.json(company);
    } catch (error) {
      console.error('Create company error:', error);
      res.status(500).json({ message: 'Failed to create company' });
    }
  });

  app.patch('/api/admin/companies/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      await storage.updateCompany(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Update company error:', error);
      res.status(500).json({ message: 'Failed to update company' });
    }
  });

  app.post('/api/admin/users/:userId/link-company/:companyId', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      await storage.linkUserToCompany(req.params.userId, req.params.companyId);
      res.json({ success: true });
    } catch (error) {
      console.error('Link user to company error:', error);
      res.status(500).json({ message: 'Failed to link user to company' });
    }
  });

  app.post('/api/admin/users/:userId/unlink-company', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      await storage.unlinkUserFromCompany(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Unlink user from company error:', error);
      res.status(500).json({ message: 'Failed to unlink user from company' });
    }
  });

  // Admin customer management routes
  app.get('/api/admin/customers', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  app.get('/api/admin/search', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.json([]);
      }
      const results = await storage.searchCustomers(q as string);
      res.json(results);
    } catch (error) {
      console.error('Search customers error:', error);
      res.status(500).json({ message: 'Failed to search customers' });
    }
  });

  app.get('/api/admin/reports', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const reports = await storage.getBusinessReports();
      res.json(reports);
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  // Admin manually create quote
  app.post('/api/admin/quotes/create', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { customerId, amount, validUntil, estimatedDeliveryDate, notes } = req.body;
      
      if (!customerId || !amount || !validUntil) {
        return res.status(400).json({ message: 'Customer ID, amount, and valid until date are required' });
      }

      // Verify customer exists
      const customer = await storage.getUser(customerId);
      if (!customer || customer.isAdmin) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Create a new RFQ first for this manual quote
      const rfq = await storage.createRFQ({
        userId: customerId,
        projectName: 'Manual Quote Request',
        material: 'Various',
        tolerance: 'Standard',
        quantity: 1,
        notes: 'Admin created manual quote',
      });

      // Create the quote with auto-generated quote number (createQuote handles quoteNumber generation)
      const quote = await storage.createQuote({
        rfqId: rfq.id,
        amount: amount.toString(),
        validUntil: new Date(validUntil),
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined,
        notes,
      });

      // Send email notification to customer about new quote
      try {
        await sendCustomerQuoteNotification({
          customerEmail: customer.email,
          customerName: customer.name || 'Customer',
          quoteDetails: {
            id: quote.id,
            projectName: rfq.projectName,
            totalPrice: parseFloat(amount),
            deliveryDate: estimatedDeliveryDate,
            rfqId: rfq.id,
          }
        });
      } catch (error) {
        console.error('Failed to send customer quote notification:', error);
      }

      res.json({ success: true, quote, rfq });
    } catch (error) {
      console.error('Manual quote creation error:', error);
      res.status(500).json({ message: 'Failed to create manual quote' });
    }
  });

  // Admin manually create order
  app.post('/api/admin/orders/create', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { 
        customerId, 
        projectName, 
        material, 
        materialGrade,
        finishing,
        tolerance, 
        quantity, 
        amount, 
        estimatedCompletion,
        notes 
      } = req.body;
      
      if (!customerId || !projectName || !material || !tolerance || !quantity || !amount) {
        return res.status(400).json({ 
          message: 'Customer ID, project name, material, tolerance, quantity, and amount are required' 
        });
      }

      // Verify customer exists
      const customer = await storage.getUser(customerId);
      if (!customer || customer.isAdmin) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Create a new RFQ first for this manual order
      const rfq = await storage.createRFQ({
        userId: customerId,
        projectName,
        material,
        materialGrade,
        finishing,
        tolerance,
        quantity: parseInt(quantity),
        notes: notes || 'Admin created manual order',
      });

      // Update RFQ status to accepted
      await storage.updateRFQStatus(rfq.id, 'accepted');

      // Create the order with auto-generated order number (createOrder handles orderNumber generation)
      const order = await storage.createOrder({
        userId: customerId,
        rfqId: rfq.id,
        projectName,
        material,
        materialGrade,
        finishing,
        tolerance,
        quantity: parseInt(quantity),
        quantityRemaining: parseInt(quantity),
        amount: amount.toString(),
        notes,
        estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : undefined,
      });

      res.json({ success: true, order, rfq });
    } catch (error) {
      console.error('Manual order creation error:', error);
      res.status(500).json({ message: 'Failed to create manual order' });
    }
  });

  // Link user to company
  app.post('/api/admin/users/:userId/link', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { companyId } = req.body;
      
      if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
      }

      await storage.linkUserToCompany(userId, companyId);
      res.json({ success: true, message: 'User linked to company successfully' });
    } catch (error) {
      console.error('Link user error:', error);
      res.status(500).json({ message: 'Failed to link user to company' });
    }
  });

  // Unlink user from company
  app.post('/api/admin/users/:userId/unlink', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      await storage.unlinkUserFromCompany(userId);
      res.json({ success: true, message: 'User unlinked from company successfully' });
    } catch (error) {
      console.error('Unlink user error:', error);
      res.status(500).json({ message: 'Failed to unlink user from company' });
    }
  });

  // Get users by customer number
  app.get('/api/admin/customers/:customerNumber/users', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { customerNumber } = req.params;
      const users = await storage.getUsersByCustomerNumber(customerNumber);
      res.json(users);
    } catch (error) {
      console.error('Get users by customer number error:', error);
      res.status(500).json({ message: 'Failed to get users for customer number' });
    }
  });

  // Create new user (admin only)
  app.post('/api/admin/users', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { name, email, company, phone, password, role } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with admin verification
      const userData = {
        name,
        email,
        company: company || null,
        phone: phone || null,
        passwordHash: hashedPassword,
        role,
        isVerified: true, // Admin-created users are automatically verified
        verificationCode: null,
        verificationCodeExpiry: null,
      };

      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { passwordHash: _, ...userResponse } = user;
      
      res.status(201).json({
        message: 'User created successfully',
        user: userResponse
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent admin from deleting themselves
      if (user.id === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      // Prevent deletion of other admin users
      if (user.isAdmin) {
        return res.status(400).json({ message: 'Cannot delete admin users' });
      }

      // Delete user
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Company management routes
  app.get('/api/admin/companies', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error('Get companies error:', error);
      res.status(500).json({ message: 'Failed to get companies' });
    }
  });

  app.post('/api/admin/companies', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const companyData = req.body;
      const company = await storage.createCompany(companyData);
      res.json(company);
    } catch (error) {
      console.error('Create company error:', error);
      res.status(500).json({ message: 'Failed to create company' });
    }
  });

  app.put('/api/admin/companies/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      console.log(`[DEBUG] Updating company ${id} with data:`, updateData);
      await storage.updateCompany(id, updateData);
      res.json({ success: true, message: 'Company updated successfully' });
    } catch (error) {
      console.error('Update company error:', error);
      res.status(500).json({ message: 'Failed to update company' });
    }
  });

  // Assign customer number to company (admin only)
  app.post('/api/admin/companies/:companyId/assign-customer-number', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const { customerNumber } = req.body;

      if (!customerNumber || !customerNumber.match(/^CU\d{4}$/)) {
        return res.status(400).json({ message: 'Invalid customer number format. Use CU0001 format.' });
      }

      // Check if company exists
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Check if customer number is available (unless it's the same company)
      if (company.customerNumber !== customerNumber) {
        const isAvailable = await storage.isCustomerNumberAvailable(customerNumber);
        if (!isAvailable) {
          return res.status(400).json({ message: 'Customer number is already assigned to another company' });
        }
      }

      // Assign the customer number
      await storage.assignCustomerNumber(companyId, customerNumber);
      
      res.json({ success: true, message: 'Customer number assigned successfully' });
    } catch (error) {
      console.error('Assign customer number error:', error);
      res.status(500).json({ message: 'Failed to assign customer number' });
    }
  });

  // Check if customer number is available (admin only)
  app.get('/api/admin/customer-number/:customerNumber/available', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { customerNumber } = req.params;
      
      if (!customerNumber.match(/^CU\d{4}$/)) {
        return res.status(400).json({ message: 'Invalid customer number format. Use CU0001 format.' });
      }

      const isAvailable = await storage.isCustomerNumberAvailable(customerNumber);
      const existingCompany = isAvailable ? null : await storage.getCompanyByCustomerNumber(customerNumber);
      
      res.json({ 
        available: isAvailable,
        existingCompany: existingCompany ? {
          id: existingCompany.id,
          name: existingCompany.name,
          customerNumber: existingCompany.customerNumber
        } : null
      });
    } catch (error) {
      console.error('Check customer number availability error:', error);
      res.status(500).json({ message: 'Failed to check customer number availability' });
    }
  });

  // Generate next available customer number (admin only)
  app.get('/api/admin/customer-number/next', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const nextNumber = await storage.generateCustomerNumber();
      res.json({ customerNumber: nextNumber });
    } catch (error) {
      console.error('Generate customer number error:', error);
      res.status(500).json({ message: 'Failed to generate customer number' });
    }
  });

  // Merge companies with same customer number (admin only)
  app.post('/api/admin/companies/merge', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { primaryCompanyId, companyIdsToMerge, customerNumber, companyName } = req.body;

      if (!primaryCompanyId || !customerNumber || !companyName) {
        return res.status(400).json({ message: 'Primary company ID, customer number, and company name are required' });
      }

      if (!customerNumber.match(/^CU\d{4}$/)) {
        return res.status(400).json({ message: 'Invalid customer number format. Use CU0001 format.' });
      }

      // Check if companies exist
      const primaryCompany = await storage.getCompanyById(primaryCompanyId);
      if (!primaryCompany) {
        return res.status(404).json({ message: 'Primary company not found' });
      }

      // Merge companies
      await storage.mergeCompanies(primaryCompanyId, companyIdsToMerge || [], customerNumber, companyName);
      
      res.json({ success: true, message: 'Companies merged successfully' });
    } catch (error) {
      console.error('Merge companies error:', error);
      res.status(500).json({ message: 'Failed to merge companies' });
    }
  });

  app.delete('/api/admin/companies/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCompany(id);
      res.json({ success: true, message: 'Company deleted successfully' });
    } catch (error) {
      console.error('Delete company error:', error);
      res.status(500).json({ message: 'Failed to delete company' });
    }
  });

  app.get('/api/admin/companies/:id/users', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const users = await storage.getUsersByCompanyId(id);
      res.json(users);
    } catch (error) {
      console.error('Get company users error:', error);
      res.status(500).json({ message: 'Failed to get company users' });
    }
  });

  // Quality check inspection report endpoints  
  app.post('/api/admin/orders/:orderId/quality-check-files', upload.array('files'), authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ message: 'Order ID is required' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        const fileExt = path.extname(file.originalname).toLowerCase();
        let fileType: 'step' | 'pdf' | 'excel' | 'image' = 'pdf';
        if (['.xlsx', '.xls'].includes(fileExt)) {
          fileType = 'excel';
        } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
          fileType = 'image';
        }

        const fileRecord = await storage.createFile({
          userId: req.user.id,
          fileName: file.originalname,
          fileUrl: `/${file.path}`,
          fileSize: file.size,
          fileType: fileType,
          linkedToType: 'quality_check',
          linkedToId: orderId,
        });

        uploadedFiles.push(fileRecord);
      }

      res.json(uploadedFiles);
    } catch (error) {
      console.error('Quality check file upload error:', error);
      res.status(500).json({ 
        message: 'Quality check file upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Quality check upload endpoint for admin (PATCH method expected by frontend)
  app.patch('/api/orders/:orderId/quality-check', authenticateToken, requireAdmin, upload.array('qualityCheck'), async (req: any, res) => {
    try {
      const { orderId } = req.params;
      console.log('Quality check upload request for order:', orderId);
      console.log('Files received:', req.files?.length || 0);
      const uploadedFiles = [];

      if (!req.files || req.files.length === 0) {
        console.log('No files in request');
        return res.status(400).json({ message: 'Quality check files are required' });
      }

      // Check if order exists
      const order = await storage.getOrderById(orderId);
      if (!order) {
        console.log('Order not found:', orderId);
        return res.status(404).json({ message: 'Order not found' });
      }

      for (const file of req.files) {
        console.log('Processing file:', file.originalname, 'size:', file.size);
        const fileExt = path.extname(file.originalname).toLowerCase();
        let fileType: 'step' | 'pdf' | 'excel' | 'image' = 'pdf';
        if (['.xlsx', '.xls'].includes(fileExt)) {
          fileType = 'excel';
        } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
          fileType = 'image';
        }

        const fileRecord = await storage.createFile({
          userId: req.user.id,
          fileName: file.originalname,
          fileUrl: `/${file.path}`, // Add leading slash for proper URL
          fileSize: file.size,
          fileType: fileType,
          linkedToType: 'quality_check',
          linkedToId: orderId,
        });

        uploadedFiles.push(fileRecord);
      }

      console.log('Quality check files uploaded successfully:', uploadedFiles.length);
      res.json({ success: true, message: 'Quality check reports uploaded successfully', files: uploadedFiles });
    } catch (error) {
      console.error('Quality check upload error:', error);
      res.status(500).json({ message: 'Failed to upload quality check reports: ' + error.message });
    }
  });

  app.get('/api/orders/:orderId/quality-check-files', authenticateToken, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user owns this order or is admin
      if (order.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const files = await storage.getQualityCheckFiles(orderId);
      res.json(files);
    } catch (error) {
      console.error('Get quality check files error:', error);
      res.status(500).json({ message: 'Failed to fetch quality check files' });
    }
  });

  // Delete quality check file (admin only)
  app.delete('/api/admin/orders/:orderId/quality-check-files/:fileId', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { orderId, fileId } = req.params;
      
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const result = await storage.deleteQualityCheckFile(fileId);
      if (!result) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.json({ success: true, message: 'Quality check file deleted successfully' });
    } catch (error) {
      console.error('Delete quality check file error:', error);
      res.status(500).json({ message: 'Failed to delete quality check file' });
    }
  });

  // Customer approve quality check files
  app.post('/api/orders/:orderId/approve-quality-check', authenticateToken, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const { approved, notes } = req.body;
      
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user owns this order
      if (order.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Update quality check approval status
      const qualityCheckStatus = approved ? 'approved' : 'needs_revision';
      await storage.updateQualityCheckApproval(orderId, qualityCheckStatus, notes);
      
      res.json({ success: true, message: approved ? 'Quality check approved' : 'Quality check needs revision' });
    } catch (error) {
      console.error('Approve quality check error:', error);
      res.status(500).json({ message: 'Failed to update quality check approval' });
    }
  });

  // Admin endpoint to get quality check notifications
  app.get('/api/admin/quality-check-notifications', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const notifications = await storage.getQualityCheckNotifications();
      res.json(notifications);
    } catch (error) {
      console.error('Get quality check notifications error:', error);
      res.status(500).json({ message: 'Failed to fetch quality check notifications' });
    }
  });

  // Admin endpoint to get quality check orders
  app.get('/api/admin/quality-check-orders', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const orders = await storage.getQualityCheckOrders();
      res.json(orders);
    } catch (error) {
      console.error('Get quality check orders error:', error);
      res.status(500).json({ message: 'Failed to fetch quality check orders' });
    }
  });

  // Admin endpoint to get all orders in quality_check status
  app.get('/api/admin/quality-check-orders', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const orders = await storage.getQualityCheckOrders();
      res.json(orders);
    } catch (error) {
      console.error('Get quality check orders error:', error);
      res.status(500).json({ message: 'Failed to fetch quality check orders' });
    }
  });

  // Download all order-related files as ZIP
  app.get('/api/orders/:orderId/files/download-all', authenticateToken, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if user owns this order or is admin
      if (order.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get order details
      const orders = await storage.getOrdersByUserId(order.userId);
      const orderWithRFQ = orders.find(o => o.id === orderId);
      
      if (!orderWithRFQ || !orderWithRFQ.rfq) {
        return res.status(404).json({ message: 'Order or RFQ details not found' });
      }

      // Collect all related files
      const allFiles = [];
      
      // 1. Original RFQ files (customer drawings, specifications)
      const rfqFiles = await storage.getFilesByRFQId(orderWithRFQ.rfqId);
      for (const file of rfqFiles) {
        allFiles.push({
          ...file,
          category: 'Customer-Drawings',
          description: 'Original customer drawings and specifications'
        });
      }

      // 2. Quote files (if any)
      const quote = await storage.getQuoteByRFQId(orderWithRFQ.rfqId);
      if (quote && quote.quoteFileUrl) {
        allFiles.push({
          id: `quote-${quote.id}`,
          fileName: `Quote-${quote.quoteNumber || quote.id.slice(0, 8)}.pdf`,
          fileUrl: quote.quoteFileUrl,
          category: 'Quote-Documents',
          description: 'Official quote document'
        });
      }

      // 3. Purchase Order files
      if (quote && quote.purchaseOrderUrl) {
        allFiles.push({
          id: `po-${orderId}`,
          fileName: `PurchaseOrder-${quote.purchaseOrderNumber || orderId.slice(0, 8)}.pdf`,
          fileUrl: quote.purchaseOrderUrl,
          category: 'Purchase-Orders',
          description: 'Customer purchase order'
        });
      }

      // 4. Quality check files
      const qualityCheckFiles = await storage.getQualityCheckFiles(orderId);
      for (const file of qualityCheckFiles) {
        allFiles.push({
          ...file,
          category: 'Quality-Check',
          description: 'Quality inspection reports and photos'
        });
      }

      // 5. Invoice (if uploaded by admin)
      if (orderWithRFQ.invoiceUrl) {
        allFiles.push({
          id: `invoice-${orderId}`,
          fileName: `Invoice-${orderWithRFQ.orderNumber || orderId.slice(0, 8)}.pdf`,
          fileUrl: orderWithRFQ.invoiceUrl,
          category: 'Invoices',
          description: 'Final invoice'
        });
      }

      if (allFiles.length === 0) {
        return res.status(404).json({ message: 'No files found for this order' });
      }

      // Set response headers for ZIP download
      const zipFileName = `Order-${orderWithRFQ.orderNumber || orderId.slice(0, 8)}-Complete-Package.zip`;
      res.attachment(zipFileName);
      res.type('application/zip');

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).json({ message: 'Failed to create archive' });
      });

      archive.pipe(res);

      // Add files to archive organized by category
      for (const file of allFiles) {
        try {
          let filePath = file.fileUrl;
          
          // Handle different file path formats
          if (filePath.startsWith('/')) {
            filePath = filePath.substring(1); // Remove leading slash
          }
          
          if (fs.existsSync(filePath)) {
            const folderName = file.category || 'Miscellaneous';
            archive.file(filePath, { 
              name: `${folderName}/${file.fileName}`
            });
          } else {
            console.warn(`File not found: ${filePath}`);
          }
        } catch (error) {
          console.error(`Error adding file ${file.fileName}:`, error);
        }
      }

      // Get user information
      const customer = await storage.getUser(orderWithRFQ.userId);
      
      // Add a manifest file with order details
      const manifest = {
        orderNumber: orderWithRFQ.orderNumber,
        projectName: orderWithRFQ.rfq.projectName,
        customerName: customer?.name || 'N/A',
        customerCompany: customer?.company || 'N/A',
        orderDate: orderWithRFQ.orderDate,
        orderStatus: orderWithRFQ.orderStatus,
        material: orderWithRFQ.rfq.material,
        quantity: orderWithRFQ.quantity,
        downloadDate: new Date().toISOString(),
        filesIncluded: allFiles.map(f => ({
          category: f.category,
          fileName: f.fileName,
          description: f.description
        }))
      };

      archive.append(JSON.stringify(manifest, null, 2), { 
        name: 'Order-Manifest.json'
      });

      await archive.finalize();

    } catch (error) {
      console.error('Download all files error:', error);
      res.status(500).json({ message: 'Failed to create file archive' });
    }
  });

  // Get RFQs with supplier quotes for admin tracking
  app.get('/api/admin/rfqs/supplier-quotes', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      // Get all unique RFQs that have been assigned to suppliers
      const uniqueRfqIds = await db
        .selectDistinct({ rfqId: rfqAssignments.rfqId })
        .from(rfqAssignments);
      
      const allRfqs = await db
        .select()
        .from(rfqsTable)
        .where(inArray(rfqsTable.id, uniqueRfqIds.map(r => r.rfqId)))
        .orderBy(desc(rfqsTable.createdAt));

      const rfqsWithQuotes = await Promise.all(
        allRfqs.map(async (rfq) => {
          // Get supplier quotes for this RFQ
          const quotes = await storage.getSupplierQuotesByRfqId(rfq.id);
          
          // Check if each quote has a purchase order
          const quotesWithPOStatus = await Promise.all(
            quotes.map(async (quote) => {
              const poResults = await db
                .select()
                .from(purchaseOrders)
                .where(eq(purchaseOrders.supplierQuoteId, quote.id));
              
              return {
                ...quote,
                hasPurchaseOrder: poResults.length > 0,
                purchaseOrderNumber: poResults[0]?.orderNumber || null
              };
            })
          );
          
          // Get assigned suppliers for this RFQ
          const assignments = await db
            .select()
            .from(rfqAssignments)
            .innerJoin(users, eq(rfqAssignments.supplierId, users.id))
            .where(eq(rfqAssignments.rfqId, rfq.id));

          const assignedSuppliers = assignments.map(assignment => ({
            id: assignment.users.id,
            name: assignment.users.name || 'Unknown',
            email: assignment.users.email,
            hasQuoted: quotes.some(quote => quote.supplierId === assignment.users.id)
          }));

          return {
            ...rfq,
            supplierQuotes: quotesWithPOStatus,
            assignedSuppliers
          };
        })
      );

      res.json(rfqsWithQuotes);
    } catch (error) {
      console.error('Get RFQs with supplier quotes error:', error);
      res.status(500).json({ message: 'Failed to fetch RFQs with supplier quotes' });
    }
  });

  // Update supplier quote status
  app.put('/api/admin/supplier-quotes/:quoteId/status', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { quoteId } = req.params;
      const { status, adminFeedback } = req.body;

      if (!['pending', 'accepted', 'not_selected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      await storage.updateSupplierQuoteStatus(quoteId, status, adminFeedback);

      // If quote is accepted, send notification to supplier
      if (status === 'accepted') {
        const quote = await storage.getSupplierQuoteById(quoteId);
        if (quote) {
          const supplier = await storage.getUser(quote.supplierId);
          const rfq = await storage.getRFQById(quote.rfqId);
          
          if (supplier && rfq) {
            // Create notification
            await storage.createNotification({
              userId: supplier.id,
              type: 'status_update',
              title: 'Quote Accepted',
              message: `Your quote for "${rfq.projectName}" has been accepted. Purchase order will be sent soon.`,
              relatedId: quoteId
            });

            // Send email notification
            try {
              await emailService.sendQuoteAcceptedNotification(
                supplier.email,
                supplier.name || 'Supplier',
                {
                  projectName: rfq.projectName,
                  quoteAmount: quote.price.toString(),
                  leadTime: quote.leadTime
                }
              );
            } catch (emailError) {
              console.error('Failed to send quote acceptance email:', emailError);
            }
          }
        }
      }
      
      // If quote is not selected, send notification and email to supplier
      if (status === 'not_selected') {
        const quote = await storage.getSupplierQuoteById(quoteId);
        if (quote) {
          const supplier = await storage.getUser(quote.supplierId);
          const rfq = await storage.getRFQById(quote.rfqId);
          
          if (supplier && rfq) {
            // Create notification
            await storage.createNotification({
              userId: supplier.id,
              type: 'status_update',
              title: 'Quote Not Selected',
              message: `Your quote for "${rfq.projectName}" was not selected.${adminFeedback ? ' Admin feedback: ' + adminFeedback : ''}`,
              relatedId: quoteId
            });

            // Send email notification
            try {
              await emailService.sendQuoteNotSelectedNotification(
                supplier.email,
                supplier.name || 'Supplier',
                {
                  projectName: rfq.projectName,
                  quoteAmount: quote.price.toString(),
                  adminFeedback: adminFeedback
                }
              );
            } catch (emailError) {
              console.error('Failed to send quote not selected email:', emailError);
            }
          }
        }
      }

      res.json({ success: true, message: 'Quote status updated successfully' });
    } catch (error) {
      console.error('Update supplier quote status error:', error);
      res.status(500).json({ message: 'Failed to update quote status' });
    }
  });

  // Finalize RFQ by selecting winning supplier quote and notifying others
  app.post('/api/admin/rfqs/:rfqId/finalize', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { rfqId } = req.params;
      const { supplierQuoteId, markup } = req.body;

      if (!supplierQuoteId || typeof markup !== 'number') {
        return res.status(400).json({ message: 'Supplier quote ID and markup are required' });
      }

      // Get the selected supplier quote
      const supplierQuote = await db
        .select()
        .from(supplierQuotes)
        .where(eq(supplierQuotes.id, supplierQuoteId))
        .then(results => results[0]);

      if (!supplierQuote) {
        return res.status(404).json({ message: 'Supplier quote not found' });
      }

      // Get the RFQ
      const rfq = await storage.getRFQById(rfqId);
      if (!rfq) {
        return res.status(404).json({ message: 'RFQ not found' });
      }

      // Calculate customer price with markup
      const supplierPrice = parseFloat(supplierQuote.price.toString());
      const customerPrice = supplierPrice * (1 + markup / 100);

      // Create customer quote
      const quote = await storage.createQuote({
        rfqId,
        quoteNumber: '', // Will be generated in storage
        amount: customerPrice.toString(),
        currency: 'USD',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        estimatedDeliveryDate: new Date(Date.now() + (supplierQuote.leadTime + 7) * 24 * 60 * 60 * 1000), // Lead time + 7 days buffer
        notes: `Based on supplier quote (${markup}% markup). Supplier lead time: ${supplierQuote.leadTime} days.`
      });

      // Update RFQ status to quoted
      await storage.updateRFQStatus(rfqId, 'quoted');

      // Mark the selected supplier quote as accepted
      await storage.updateSupplierQuoteStatus(supplierQuoteId, 'accepted');

      // Get all other supplier quotes for this RFQ and mark them as rejected
      const allSupplierQuotes = await storage.getSupplierQuotesByRfqId(rfqId);
      const rejectedQuotes = allSupplierQuotes.filter(q => q.id !== supplierQuoteId);
      
      // Notify rejected suppliers
      for (const rejectedQuote of rejectedQuotes) {
        await storage.updateSupplierQuoteStatus(rejectedQuote.id, 'rejected');
        
        // Send notification to rejected supplier
        await storage.createNotification({
          userId: rejectedQuote.supplierId,
          type: 'status_update',
          title: 'Quote Update - Not Selected',
          message: `Thank you for your quote on RFQ: ${rfq.projectName}. While we appreciate your submission, we have selected another quote for this project. We look forward to future opportunities to work together.`,
          relatedId: rfqId
        });
      }

      // Notify the winning supplier
      await storage.createNotification({
        userId: supplierQuote.supplierId,
        type: 'status_update',
        title: 'Congratulations! Your Quote Was Selected',
        message: `Great news! Your quote for RFQ: ${rfq.projectName} has been selected. Please await further instructions for project kickoff.`,
        relatedId: rfqId
      });

      res.json({ success: true, quote });
    } catch (error) {
      console.error('Finalize RFQ error:', error);
      res.status(500).json({ message: 'Failed to finalize RFQ' });
    }
  });

  // Create customer quote from selected supplier quote
  app.post('/api/admin/rfqs/:rfqId/create-customer-quote', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { rfqId } = req.params;
      const { supplierQuoteId, markup } = req.body;

      if (!supplierQuoteId || typeof markup !== 'number') {
        return res.status(400).json({ message: 'Supplier quote ID and markup are required' });
      }

      // Get the supplier quote
      const supplierQuote = await db
        .select()
        .from(supplierQuotes)
        .where(eq(supplierQuotes.id, supplierQuoteId))
        .then(results => results[0]);

      if (!supplierQuote) {
        return res.status(404).json({ message: 'Supplier quote not found' });
      }

      // Get the RFQ
      const rfq = await storage.getRFQById(rfqId);
      if (!rfq) {
        return res.status(404).json({ message: 'RFQ not found' });
      }

      // Calculate customer price with markup
      const supplierPrice = parseFloat(supplierQuote.price.toString());
      const customerPrice = supplierPrice * (1 + markup / 100);

      // Create customer quote
      const quote = await storage.createQuote({
        rfqId,
        quoteNumber: '', // Will be generated in storage
        amount: customerPrice.toString(),
        currency: 'USD',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        estimatedDeliveryDate: new Date(Date.now() + (supplierQuote.leadTime + 7) * 24 * 60 * 60 * 1000), // Lead time + 7 days buffer
        notes: `Based on supplier quote (${markup}% markup). Supplier lead time: ${supplierQuote.leadTime} days.`
      });

      // Update RFQ status to quoted
      await storage.updateRFQStatus(rfqId, 'quoted');

      // Mark the selected supplier quote as accepted
      await storage.updateSupplierQuoteStatus(supplierQuoteId, 'accepted');

      // Get all other supplier quotes for this RFQ and mark them as rejected
      const allSupplierQuotes = await storage.getSupplierQuotesByRfqId(rfqId);
      const rejectedQuotes = allSupplierQuotes.filter(q => q.id !== supplierQuoteId);
      
      // Notify rejected suppliers
      for (const rejectedQuote of rejectedQuotes) {
        await storage.updateSupplierQuoteStatus(rejectedQuote.id, 'rejected');
        
        // Send notification to rejected supplier
        await storage.createNotification({
          userId: rejectedQuote.supplierId,
          type: 'status_update',
          title: 'Quote Update - Not Selected',
          message: `Thank you for your quote on RFQ: ${rfq.projectName}. While we appreciate your submission, we have selected another quote for this project. We look forward to future opportunities to work together.`,
          relatedId: rfqId
        });
      }

      res.json({ success: true, quote });
    } catch (error) {
      console.error('Create customer quote error:', error);
      res.status(500).json({ message: 'Failed to create customer quote' });
    }
  });

  // ===== SUPPLIER PORTAL API ROUTES =====

  // Get supplier dashboard stats
  app.get('/api/supplier/dashboard/stats', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const supplierId = req.user.id;
      
      // Get assigned RFQs count
      const assignedRfqs = await storage.getAssignedRfqsBySupplierId(supplierId);
      const pendingRfqs = assignedRfqs.filter(a => a.status === 'assigned').length;
      
      // Get submitted quotes count
      const supplierQuotes = await storage.getSupplierQuotesBySupplierId(supplierId);
      const submittedQuotes = supplierQuotes.filter(q => q.status === 'pending').length;
      const acceptedQuotes = supplierQuotes.filter(q => q.status === 'accepted').length;
      
      // Get notifications count
      const notifications = await storage.getNotificationsByUserId(supplierId);
      const unreadNotifications = notifications.filter(n => !n.isRead).length;
      
      res.json({
        pendingRfqs,
        submittedQuotes,
        acceptedQuotes,
        unreadNotifications
      });
    } catch (error) {
      console.error('Supplier dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Get assigned RFQs for supplier
  app.get('/api/supplier/rfqs', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const supplierId = req.user.id;
      const assignedRfqs = await storage.getAssignedRfqsBySupplierId(supplierId);
      
      // Mark RFQ assignment notifications as read when supplier views their RFQs
      const notifications = await storage.getNotificationsByUserId(supplierId);
      const rfqNotifications = notifications.filter(n => 
        !n.isRead && 
        n.type === 'rfq_assignment' && 
        assignedRfqs.some(rfq => rfq.id === n.relatedId)
      );
      
      // Mark these notifications as read
      for (const notification of rfqNotifications) {
        await storage.markNotificationAsRead(notification.id);
      }
      
      res.json(assignedRfqs);
    } catch (error) {
      console.error('Get supplier RFQs error:', error);
      res.status(500).json({ message: 'Failed to fetch assigned RFQs' });
    }
  });

  // Submit supplier quote
  app.post('/api/supplier/quote', authenticateToken, requireSupplier, upload.single('quoteFile'), async (req: any, res) => {
    try {
      const { 
        rfqId, 
        price, 
        leadTime, 
        notes,
        // Enhanced pricing breakdown fields
        currency,
        toolingCost,
        partCostPerPiece,
        materialCostPerPiece,
        machiningCostPerPiece,
        finishingCostPerPiece,
        packagingCostPerPiece,
        shippingCost,
        taxPercentage,
        discountPercentage,
        paymentTerms,
        validUntil
      } = req.body;
      const supplierId = req.user.id;
      
      if (!rfqId || !price || !leadTime) {
        return res.status(400).json({ message: 'RFQ ID, price, and lead time are required' });
      }

      // Check if supplier is assigned to this RFQ
      const assignedRfqs = await storage.getAssignedRfqsBySupplierId(supplierId);
      const isAssigned = assignedRfqs.some(a => a.rfq.id === rfqId);
      
      if (!isAssigned) {
        return res.status(403).json({ message: 'You are not assigned to this RFQ' });
      }

      // Check if supplier has already submitted a quote for this RFQ
      const existingQuotes = await storage.getSupplierQuotesBySupplierId(supplierId);
      const hasExistingQuote = existingQuotes.some(q => q.rfq.id === rfqId);
      
      if (hasExistingQuote) {
        return res.status(400).json({ message: 'You have already submitted a quote for this RFQ' });
      }

      const quoteData: any = {
        rfqId,
        supplierId,
        price: parseFloat(price),
        leadTime: parseInt(leadTime),
        notes: notes || null,
        // Enhanced pricing breakdown fields
        currency: currency || 'USD',
        paymentTerms: paymentTerms || 'Net 30'
      };

      // Add optional pricing breakdown fields only if provided
      if (toolingCost) quoteData.toolingCost = parseFloat(toolingCost);
      if (partCostPerPiece) quoteData.partCostPerPiece = parseFloat(partCostPerPiece);
      if (materialCostPerPiece) quoteData.materialCostPerPiece = parseFloat(materialCostPerPiece);
      if (machiningCostPerPiece) quoteData.machiningCostPerPiece = parseFloat(machiningCostPerPiece);
      if (finishingCostPerPiece) quoteData.finishingCostPerPiece = parseFloat(finishingCostPerPiece);
      if (packagingCostPerPiece) quoteData.packagingCostPerPiece = parseFloat(packagingCostPerPiece);
      if (shippingCost) quoteData.shippingCost = parseFloat(shippingCost);
      if (taxPercentage) quoteData.taxPercentage = parseFloat(taxPercentage);
      if (discountPercentage) quoteData.discountPercentage = parseFloat(discountPercentage);
      if (validUntil) quoteData.validUntil = new Date(validUntil);

      // Add file URL if uploaded
      if (req.file) {
        quoteData.quoteFileUrl = `/${req.file.path}`;
      }

      const newQuote = await storage.createSupplierQuote(quoteData);
      
      // Create notification for admin about new quote
      const rfq = await storage.getRFQById(rfqId);
      if (rfq) {
        // Find admin users
        const allUsers = await storage.getAllCustomers();
        const adminUsers = allUsers.filter(u => u.isAdmin);
        
        for (const admin of adminUsers) {
          await storage.createNotification({
            userId: admin.id,
            type: 'status_update',
            title: 'New Supplier Quote Received',
            message: `${req.user.name} has submitted a quote for RFQ: ${rfq.projectName}`,
            relatedId: rfqId
          });
        }
      }

      res.json({ success: true, quote: newQuote });
    } catch (error) {
      console.error('Submit supplier quote error:', error);
      res.status(500).json({ message: 'Failed to submit quote' });
    }
  });

  // Get supplier's submitted quotes
  app.get('/api/supplier/quotes', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const supplierId = req.user.id;
      const quotes = await storage.getSupplierQuotesBySupplierId(supplierId);
      res.json(quotes);
    } catch (error) {
      console.error('Get supplier quotes error:', error);
      res.status(500).json({ message: 'Failed to fetch quotes' });
    }
  });

  // Get supplier orders (accepted quotes that became orders)
  app.get('/api/supplier/orders', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const supplierId = req.user.id;
      
      // Get accepted quotes
      const acceptedQuotes = await storage.getSupplierQuotesBySupplierId(supplierId);
      const acceptedQuoteIds = acceptedQuotes
        .filter(q => q.status === 'accepted')
        .map(q => q.id);

      // For now, return the accepted quotes as "orders"
      // In a full implementation, you'd create actual supplier orders
      res.json(acceptedQuotes.filter(q => q.status === 'accepted'));
    } catch (error) {
      console.error('Get supplier orders error:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Get supplier notifications
  app.get('/api/supplier/notifications', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const supplierId = req.user.id;
      const notifications = await storage.getNotificationsByUserId(supplierId);
      
      // Don't auto-mark as read - let dashboard show unread notifications
      // Only mark as read when user specifically interacts with them
      
      res.json(notifications);
    } catch (error) {
      console.error('Get supplier notifications error:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  app.put('/api/supplier/notifications/:id/read', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: 'Failed to update notification' });
    }
  });

  // Download purchase order file for supplier
  app.get('/api/supplier/purchase-orders/:poId/download', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const { poId } = req.params;
      const supplierId = req.user.id;
      
      // Get the purchase order and verify it belongs to this supplier
      const po = await storage.getPurchaseOrderById(poId);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      if (po.supplierId !== supplierId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (!po.poFileUrl) {
        return res.status(404).json({ message: 'Purchase order file not found' });
      }
      
      const filePath = path.join(process.cwd(), po.poFileUrl);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Purchase order file not found on server' });
      }
      
      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PO_${po.orderNumber}.pdf"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error reading file' });
        }
      });
      
    } catch (error) {
      console.error('Supplier PO download error:', error);
      res.status(500).json({ message: 'Failed to download purchase order' });
    }
  });

  // Archive purchase order (admin endpoint)
  app.patch('/api/admin/purchase-orders/:poId/archive', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { poId } = req.params;
      
      const po = await storage.getPurchaseOrderById(poId);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Update status to archived with timestamp
      await storage.updatePurchaseOrder(poId, {
        status: 'archived' as any,
        archivedAt: new Date()
      });
      
      // Notify supplier about archival
      await storage.createNotification({
        userId: po.supplierId,
        type: 'status_update',
        title: 'Purchase Order Archived',
        message: `Purchase order ${po.orderNumber} has been completed and archived`,
        relatedId: poId
      });
      
      res.json({ success: true, message: 'Purchase order archived successfully' });
    } catch (error) {
      console.error('Archive purchase order error:', error);
      res.status(500).json({ message: 'Failed to archive purchase order' });
    }
  });

  // Get supplier messages
  app.get('/api/supplier/messages', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const supplierId = req.user.id;
      const messages = await storage.getMessagesByUserId(supplierId);
      res.json(messages);
    } catch (error) {
      console.error('Get supplier messages error:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Get supplier profile
  app.get('/api/supplier/profile', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const supplierId = req.user.id;
      const supplier = await storage.getUser(supplierId);
      
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      // Return user data with company name included
      const profileData = {
        id: supplier.id,
        name: supplier.company || supplier.name, // Use company name from signup, fallback to user name
        email: supplier.email,
        phone: supplier.phone,
        website: supplier.website,
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        country: supplier.country,
        postalCode: supplier.postalCode,
        capabilities: supplier.capabilities,
        certifications: supplier.certifications
      };

      res.json(profileData);
    } catch (error) {
      console.error('Get supplier profile error:', error);
      res.status(500).json({ message: 'Failed to fetch supplier profile' });
    }
  });

  // Update supplier profile
  app.put('/api/supplier/profile', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const supplierId = req.user.id;
      const { name, phone, website, capabilities, certifications, address, city, state, country, postalCode } = req.body;
      
      const updateData: any = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (website) updateData.website = website;
      if (capabilities) updateData.capabilities = capabilities; // Already stringified by frontend
      if (certifications) updateData.certifications = certifications; // Already stringified by frontend
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (state) updateData.state = state;
      if (country) updateData.country = country;
      if (postalCode) updateData.postalCode = postalCode;

      await storage.updateSupplierProfile(supplierId, updateData);
      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update supplier profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // ===== FILE UPLOAD ROUTES =====

  // Multiple file upload for admin quote creation
  app.post('/api/upload-files', authenticateToken, upload.array('files', 10), async (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const uploadedFiles = req.files.map((file: any) => file.path);
      res.json({ 
        success: true, 
        files: uploadedFiles,
        message: `${req.files.length} file(s) uploaded successfully`
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'Failed to upload files' });
    }
  });

  // ===== ADMIN SUPPLIER MANAGEMENT ROUTES =====

  // Get all suppliers
  app.get('/api/admin/suppliers', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error('Get suppliers error:', error);
      res.status(500).json({ message: 'Failed to fetch suppliers' });
    }
  });

  // Generate next available vendor number (admin only) - MUST be before :supplierId route
  app.get('/api/admin/suppliers/generate-vendor-number', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      console.log('Starting vendor number generation...');
      // Generate V number for supplier companies, not individual suppliers
      const vendorNumber = await storage.generateCompanyNumber('supplier');
      console.log('Generated vendor number:', vendorNumber);
      res.json({ vendorNumber });
    } catch (error) {
      console.error('Generate vendor number error:', error);
      res.status(500).json({ message: 'Failed to generate vendor number' });
    }
  });

  // Get supplier by ID (admin only)
  app.get('/api/admin/suppliers/:supplierId', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { supplierId } = req.params;
      const supplier = await storage.getSupplierById(supplierId);
      
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      res.json(supplier);
    } catch (error) {
      console.error('Get supplier by ID error:', error);
      res.status(500).json({ message: 'Failed to fetch supplier details' });
    }
  });

  // Update supplier profile (admin only)
  app.put('/api/admin/suppliers/:supplierId', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { supplierId } = req.params;
      const updateData = req.body;

      // Verify supplier exists
      const supplier = await storage.getSupplierById(supplierId);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      await storage.updateSupplierProfile(supplierId, updateData);
      res.json({ success: true, message: 'Supplier profile updated successfully' });
    } catch (error) {
      console.error('Update supplier profile error:', error);
      res.status(500).json({ message: 'Failed to update supplier profile' });
    }
  });

  // Create/assign supplier company with vendor number (admin only)
  app.post('/api/admin/suppliers/:supplierId/assign-vendor-number', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { supplierId } = req.params;
      const { vendorNumber, companyName } = req.body;

      if (!vendorNumber) {
        return res.status(400).json({ message: 'Vendor number is required' });
      }

      // Use provided company name or generate a default one
      const finalCompanyName = companyName || `Supplier Company ${vendorNumber}`;

      // Validate vendor number format
      if (!vendorNumber.match(/^V\d{4}$/)) {
        return res.status(400).json({ message: 'Invalid vendor number format. Use V0001, V0002, etc.' });
      }

      // Verify supplier exists - simplified check
      const supplier = await storage.getUser(supplierId);
      if (!supplier || supplier.role !== 'supplier') {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      // Create or find supplier company with this vendor number
      let company = await storage.getCompanyByCustomerNumber(vendorNumber);
      
      if (!company) {
        // Create new supplier company
        company = await storage.createCompany({
          name: finalCompanyName,
          companyNumber: vendorNumber,
          companyType: 'supplier',
          contactEmail: supplier.email,
        });
      }

      // Link supplier to the company
      await storage.updateUserProfile(supplierId, {
        companyId: company.id,
        companyNameInput: finalCompanyName,
      });

      res.json({ success: true, message: 'Supplier company assigned successfully' });
    } catch (error) {
      console.error('Assign vendor number error:', error);
      res.status(500).json({ message: 'Failed to assign vendor number' });
    }
  });



  // Check vendor number and get existing company name (admin only)
  app.get('/api/admin/suppliers/check-vendor-number/:vendorNumber', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { vendorNumber } = req.params;
      
      // Validate vendor number format
      if (!vendorNumber.match(/^V\d{4}$/)) {
        return res.status(400).json({ message: 'Invalid vendor number format' });
      }

      // TODO: Implement company name lookup for vendor numbers if needed
      const existingCompanyName = null;
      
      res.json({ 
        exists: !!existingCompanyName,
        companyName: existingCompanyName 
      });
    } catch (error) {
      console.error('Check vendor number error:', error);
      res.status(500).json({ message: 'Failed to check vendor number' });
    }
  });

  // Create supplier account (admin only)
  app.post('/api/admin/suppliers', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { name, email, company, phone, password, role } = req.body;

      if (!name || !email || !company || !password) {
        return res.status(400).json({ message: 'Name, email, company, and password are required' });
      }

      // Check if user already exists with the same role
      const existingUser = await storage.getUserByEmailAndRole(email, 'supplier');
      if (existingUser) {
        return res.status(400).json({ message: 'Supplier with this email already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create supplier user account
      const user = await storage.createAdminUser({
        email,
        passwordHash,
        name,
        companyNameInput: company,
        role: 'supplier',
        isAdmin: false,
        isVerified: true, // Admin-created accounts are auto-verified
        verificationCode: null,
        verificationCodeExpiry: null,
      });

      res.json({ 
        success: true, 
        message: 'Supplier account created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Create supplier error:', error);
      res.status(500).json({ message: 'Failed to create supplier account' });
    }
  });

  // Create customer account by admin
  app.post('/api/admin/customers', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { name, email, companyName, phone, password } = req.body;

      if (!name || !email || !companyName || !password) {
        return res.status(400).json({ message: 'Name, email, company name, and password are required' });
      }

      // Check if user already exists with the same role
      const existingUser = await storage.getUserByEmailAndRole(email, 'customer');
      if (existingUser) {
        return res.status(400).json({ message: 'Customer with this email already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user with admin flags
      const newUser = await storage.createAdminUser({
        name,
        email,
        passwordHash,
        companyNameInput: companyName,
        phone: phone || null,
        role: 'customer',
        isVerified: true, // Admin-created accounts are pre-verified
        isAdminCreated: true,
        mustResetPassword: true
      });

      res.json({ success: true, message: 'Customer account created successfully' });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ message: 'Failed to create customer account' });
    }
  });

  // Update customer profile (admin only)
  app.put('/api/admin/customers/:customerId', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { customerId } = req.params;
      const updateData = req.body;

      // Verify customer exists
      const customer = await storage.getUser(customerId);
      if (!customer || customer.role !== 'customer') {
        return res.status(404).json({ message: 'Customer not found' });
      }

      await storage.updateUserProfile(customerId, updateData);
      res.json({ success: true, message: 'Customer profile updated successfully' });
    } catch (error) {
      console.error('Update customer profile error:', error);
      res.status(500).json({ message: 'Failed to update customer profile' });
    }
  });

  // Delete supplier account (admin only)
  app.delete('/api/admin/suppliers/:supplierId', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { supplierId } = req.params;

      // Verify supplier exists
      const supplier = await storage.getUser(supplierId);
      if (!supplier || supplier.role !== 'supplier') {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      // Check if supplier has any related data that prevents deletion
      const hasRFQs = await storage.hasSupplierRFQs(supplierId);
      const hasQuotes = await storage.hasSupplierQuotes(supplierId);
      const hasPurchaseOrders = await storage.hasSupplierPurchaseOrders(supplierId);
      const hasMessages = await storage.hasSupplierMessages(supplierId);

      if (hasRFQs || hasQuotes || hasPurchaseOrders || hasMessages) {
        return res.status(400).json({ 
          message: 'Cannot delete supplier account with existing RFQs, quotes, purchase orders, or messages. Please remove or transfer this data first.' 
        });
      }

      // Delete supplier user account
      const deleted = await storage.deleteUser(supplierId);
      if (!deleted) {
        return res.status(404).json({ message: 'Supplier not found or could not be deleted' });
      }

      res.json({ 
        success: true,
        message: 'Supplier account deleted successfully' 
      });
    } catch (error) {
      console.error('Delete supplier error:', error);
      res.status(500).json({ message: 'Failed to delete supplier account. The supplier may have existing data that prevents deletion.' });
    }
  });

  // Create quote request to supplier
  app.post('/api/admin/quotes/create-to-supplier', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { supplierId, projectName, material, quantity, description, dueDate, specialInstructions, attachedFiles } = req.body;
      
      if (!supplierId || !projectName || !material || !quantity || !description) {
        return res.status(400).json({ message: 'Supplier ID, project name, material, quantity, and description are required' });
      }

      // Verify supplier exists
      const supplier = await storage.getUser(supplierId);
      if (!supplier || supplier.role !== 'supplier') {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      // Create a new RFQ for this direct quote request
      const rfq = await storage.createRFQ({
        userId: req.user.id, // Admin creates this on behalf of the system
        projectName,
        material,
        tolerance: 'Standard',
        quantity: parseInt(quantity),
        notes: description,
        specialInstructions,
        status: 'submitted'
      });

      // If files were attached, link them to the RFQ
      if (attachedFiles && attachedFiles.length > 0) {
        for (const filePath of attachedFiles) {
          await storage.createFile({
            userId: req.user.id,
            fileName: path.basename(filePath),
            fileUrl: filePath,
            fileSize: 0, // Will be updated by the file upload handler
            fileType: 'step', // Default to step, will be updated by file upload handler
            linkedToType: 'rfq',
            linkedToId: rfq.id
          });
        }
      }

      // Assign RFQ to the specific supplier
      await storage.assignRfqToSuppliers(rfq.id, [supplierId]);

      // Send email notification to supplier
      if (supplier.email) {
        try {
          await emailService.sendRfqAssignmentNotification(
            supplier.email,
            supplier.name || 'Supplier',
            {
              projectName,
              material,
              quantity: parseInt(quantity),
              tolerance: 'Standard',
              manufacturingProcess: undefined,
              notes: description
            }
          );
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Continue without failing the request
        }
      }

      // Create a notification for the supplier
      await storage.createNotification({
        userId: supplierId,
        type: 'rfq_assignment',
        title: 'New RFQ Assigned',
        message: `You have been assigned a new RFQ for: ${projectName}`,
        relatedId: rfq.id
      });

      res.json({ success: true, rfq });
    } catch (error) {
      console.error('Create quote to supplier error:', error);
      res.status(500).json({ message: 'Failed to create quote request' });
    }
  });

  // Create bulk quote request to multiple suppliers
  app.post('/api/admin/quotes/create-bulk', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { supplierIds, projectName, material, quantity, description, dueDate, specialInstructions, attachedFiles } = req.body;
      
      if (!supplierIds || !Array.isArray(supplierIds) || supplierIds.length === 0 || !projectName || !material || !quantity || !description) {
        return res.status(400).json({ message: 'Supplier IDs array, project name, material, quantity, and description are required' });
      }

      let successCount = 0;
      let failureCount = 0;
      const results = [];

      // Create a single RFQ for this bulk quote request
      const rfq = await storage.createRFQ({
        userId: req.user.id, // Admin creates this on behalf of the system
        projectName,
        material,
        tolerance: 'Standard',
        quantity: parseInt(quantity),
        notes: description,
        specialInstructions,
        status: 'submitted'
      });

      // Generate and assign SQTE number to the RFQ
      const sqteNumber = await storage.generateSqteNumber();
      await storage.assignSqteNumber(rfq.id, sqteNumber);

      // If files were attached, update their linking to the created RFQ
      if (attachedFiles && attachedFiles.length > 0) {
        for (const filePath of attachedFiles) {
          // Find existing file record by file path and update its linking
          const existingFile = await storage.getFileByPath(filePath);
          if (existingFile) {
            await storage.updateFile(existingFile.id, {
              linkedToType: 'rfq',
              linkedToId: rfq.id
            });
          }
        }
      }

      // Assign RFQ to all suppliers
      await storage.assignRfqToSuppliers(rfq.id, supplierIds);

      // Send notifications to each supplier
      for (const supplierId of supplierIds) {
        try {
          // Verify supplier exists
          const supplier = await storage.getUser(supplierId);
          if (!supplier || supplier.role !== 'supplier') {
            failureCount++;
            results.push({ supplierId, success: false, error: 'Supplier not found' });
            continue;
          }

          // Get all users from the supplier's company for email notifications
          const companyUsers = await storage.getSupplierCompanyUsers(supplierId);
          
          // Send email notifications to all company users
          for (const companyUser of companyUsers) {
            if (companyUser.email) {
              try {
                await emailService.sendRfqAssignmentNotification(
                  companyUser.email,
                  companyUser.name || 'Supplier',
                  {
                    projectName,
                    material,
                    quantity: parseInt(quantity),
                    tolerance: 'Standard',
                    manufacturingProcess: undefined,
                    notes: description
                  }
                );
              } catch (emailError) {
                console.error('Failed to send email notification to', companyUser.email, emailError);
              }
            }

            // Create portal notification for each company user
            await storage.createNotification({
              userId: companyUser.id,
              type: 'rfq_assignment',
              title: 'New RFQ Assigned',
              message: `You have been assigned a new RFQ for: ${projectName}`,
              relatedId: rfq.id
            });
          }

          successCount++;
          results.push({ supplierId, success: true });

        } catch (error) {
          console.error('Error processing supplier', supplierId, error);
          failureCount++;
          results.push({ supplierId, success: false, error: 'Processing failed' });
        }
      }

      res.json({ 
        success: true, 
        rfq, 
        successCount, 
        failureCount, 
        results 
      });
    } catch (error) {
      console.error('Create bulk quote error:', error);
      res.status(500).json({ message: 'Failed to create bulk quote request' });
    }
  });

  // Assign RFQ to suppliers
  app.post('/api/admin/rfq/:rfqId/assign', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { rfqId } = req.params;
      const { supplierIds } = req.body;
      
      if (!supplierIds || !Array.isArray(supplierIds) || supplierIds.length === 0) {
        return res.status(400).json({ message: 'Supplier IDs are required' });
      }

      // Get RFQ details for email notification
      const rfq = await storage.getRFQById(rfqId);
      if (!rfq) {
        return res.status(404).json({ message: 'RFQ not found' });
      }

      // Get supplier details for email notifications
      const suppliers = await Promise.all(
        supplierIds.map(id => storage.getUser(id))
      );

      // Assign RFQ to suppliers in database
      await storage.assignRfqToSuppliers(rfqId, supplierIds);

      // Update RFQ status to sent_to_suppliers 
      await storage.updateRFQ(rfqId, { status: 'sent_to_suppliers' });

      // Send email notifications to all assigned suppliers and their company users
      const emailPromises = suppliers.map(async (supplier) => {
        if (supplier) {
          // Get all users from the supplier's company
          const companyUsers = await storage.getSupplierCompanyUsers(supplier.id);
          
          // Send notifications to all company users
          for (const companyUser of companyUsers) {
            // Create in-portal notification
            await storage.createNotification({
              userId: companyUser.id,
              type: 'rfq_assignment',
              title: 'New RFQ Assignment',
              message: `You have received a new RFQ assignment for ${rfq.projectName}`,
              relatedId: rfqId
            });

            // Send email notification with link to supplier portal
            if (companyUser.email) {
              try {
                await sendSupplierRfqNotification({
                  supplierEmail: companyUser.email,
                  supplierName: companyUser.name || 'Supplier',
                  rfqDetails: {
                    id: rfqId,
                    projectName: rfq.projectName,
                    material: rfq.material,
                    quantity: rfq.quantity,
                    manufacturingProcess: rfq.manufacturingProcess,
                    sqteNumber: rfq.sqteNumber,
                  }
                });
              } catch (error) {
                console.error('Failed to send supplier RFQ notification to', companyUser.email, ':', error);
              }
            }
          }
        }
        return true;
      });

      await Promise.all(emailPromises);

      res.json({ 
        success: true, 
        message: `RFQ assigned to ${supplierIds.length} suppliers successfully. Email notifications sent.` 
      });
    } catch (error) {
      console.error('Assign RFQ to suppliers error:', error);
      res.status(500).json({ message: 'Failed to assign RFQ to suppliers' });
    }
  });

  // Get quotes for an RFQ (admin view)
  app.get('/api/admin/rfq/:rfqId/quotes', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { rfqId } = req.params;
      const quotes = await storage.getSupplierQuotesByRfqId(rfqId);
      res.json(quotes);
    } catch (error) {
      console.error('Get RFQ quotes error:', error);
      res.status(500).json({ message: 'Failed to fetch quotes for RFQ' });
    }
  });

  // Accept/reject supplier quote
  app.put('/api/admin/supplier-quotes/:quoteId/status', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { quoteId } = req.params;
      const { status } = req.body;
      
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status must be accepted or rejected' });
      }

      // Get quote details before updating
      const quote = await storage.getSupplierQuoteById(quoteId);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      // Get supplier and RFQ details for notifications
      const supplier = await storage.getUser(quote.supplierId);
      const rfq = await storage.getRFQById(quote.rfqId);

      // Update quote status
      await storage.updateSupplierQuoteStatus(quoteId, status);
      
      if (supplier && rfq) {
        // Create in-portal notification
        await storage.createNotification({
          userId: supplier.id,
          type: 'status_update',
          title: `Quote ${status === 'accepted' ? 'Accepted' : 'Declined'}`,
          message: `Your quote for ${rfq.projectName} has been ${status}`,
          relatedId: quote.rfqId
        });

        // Send email notification
        const emailService = require('./emailService').emailService;
        await emailService.sendQuoteStatusNotification(
          supplier.email,
          supplier.name || 'Supplier',
          rfq.projectName,
          status as 'accepted' | 'rejected',
          parseFloat(quote.price)
        );
      }
      
      res.json({ success: true, message: `Quote ${status} successfully and supplier notified` });
    } catch (error) {
      console.error('Update quote status error:', error);
      res.status(500).json({ message: 'Failed to update quote status' });
    }
  });

  // Send message to supplier
  app.post('/api/admin/message/supplier', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { receiverId, subject, content, relatedType, relatedId } = req.body;
      
      if (!receiverId || !content) {
        return res.status(400).json({ message: 'Receiver ID and content are required' });
      }

      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId,
        subject: subject || 'Message from Stoneflake Admin',
        content,
        relatedType: relatedType || null,
        relatedId: relatedId || null
      });

      // Also create a notification
      await storage.createNotification({
        userId: receiverId,
        type: 'message',
        title: 'New Message from Admin',
        message: subject || 'You have received a new message',
        relatedId: message.id
      });

      res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Serve static files
  app.use('/uploads', express.static('uploads'));
  
  // Serve converted XKT model files
  app.use('/models', express.static('public/models'));

    // Purchase Order Routes - Admin accepts supplier quote and converts to purchase order
    app.post("/api/admin/supplier-quotes/:quoteId/accept", authenticateToken, requireAdmin, async (req, res) => {
      try {
        const { quoteId } = req.params;
        const { deliveryDate, notes } = req.body;

        // Get the supplier quote with related data
        const supplierQuote = await storage.getSupplierQuoteById(quoteId);
        if (!supplierQuote) {
          return res.status(404).json({ message: "Supplier quote not found" });
        }

        // Update supplier quote status to accepted
        await storage.updateSupplierQuoteStatus(quoteId, 'accepted');

        // Create purchase order
        const purchaseOrder = await storage.createPurchaseOrder({
          supplierQuoteId: quoteId,
          supplierId: supplierQuote.supplierId,
          rfqId: supplierQuote.rfqId,
          totalAmount: supplierQuote.price,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          notes: notes || undefined,
        });

        // Create notification for supplier
        await storage.createNotification({
          userId: supplierQuote.supplierId,
          type: "order_confirmation",
          title: "Purchase Order Created",
          message: `Your quote has been accepted! Purchase order ${purchaseOrder.orderNumber} has been created.`,
          relatedId: purchaseOrder.id,
        });

        res.json({ 
          success: true, 
          purchaseOrder: purchaseOrder,
          message: "Purchase order created successfully" 
        });
      } catch (error) {
        console.error("Error accepting supplier quote:", error);
        res.status(500).json({ message: "Failed to accept supplier quote" });
      }
    });

    // Get purchase orders for supplier
    app.get("/api/supplier/orders", authenticateToken, async (req, res) => {
      try {
        const user = req.user;
        if (user.role !== 'supplier') {
          return res.status(403).json({ message: "Access denied" });
        }

        const orders = await storage.getPurchaseOrdersBySupplierId(user.id);
        res.json(orders);
      } catch (error) {
        console.error("Error fetching supplier orders:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
      }
    });

    // Accept purchase order (supplier accepts the order)
    app.post("/api/supplier/orders/:orderId/accept", authenticateToken, async (req, res) => {
      try {
        const user = req.user;
        if (user.role !== 'supplier') {
          return res.status(403).json({ message: "Access denied" });
        }

        const { orderId } = req.params;
        const order = await storage.getPurchaseOrderById(orderId);
        
        if (!order) {
          return res.status(404).json({ message: "Purchase order not found" });
        }

        if (order.supplierId !== user.id) {
          return res.status(403).json({ message: "Access denied" });
        }

        await storage.acceptPurchaseOrder(orderId);
        res.json({ success: true, message: "Purchase order accepted" });
      } catch (error) {
        console.error("Error accepting purchase order:", error);
        res.status(500).json({ message: "Failed to accept purchase order" });
      }
    });

    // ===== ENHANCED CHAT SYSTEM WITH PO SUPPORT =====
    
    // Get purchase order context for chat
    app.get('/api/chat/purchase-order/:orderNumber', authenticateToken, async (req: any, res) => {
      try {
        const { orderNumber } = req.params;
        
        // Find purchase order by order number
        const [purchaseOrder] = await db
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.orderNumber, orderNumber.toUpperCase()));
        
        if (!purchaseOrder) {
          return res.status(404).json({ message: 'Purchase order not found' });
        }
        
        // Check if user has access to this PO (admin or the assigned supplier)
        if (req.user.role !== 'admin' && req.user.id !== purchaseOrder.supplierId) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        res.json({ 
          purchaseOrder,
          chatTitle: `PO-${orderNumber.replace('PO-', '')}`
        });
      } catch (error) {
        console.error('Error fetching purchase order context:', error);
        res.status(500).json({ message: 'Failed to fetch purchase order context' });
      }
    });

    // Chat system routes
    app.get("/api/chat/messages/:userId", authenticateToken, async (req, res) => {
      try {
        const currentUser = req.user;
        const { userId } = req.params;

        let otherUserId = userId;
        
        // Security: Only allow communication with admin for non-admin users
        if (userId === 'admin') {
          const adminUser = await storage.getUserByEmail('vineeth@stone-flake.com');
          if (!adminUser) {
            return res.status(404).json({ message: "Admin user not found" });
          }
          otherUserId = adminUser.id;
        } else {
          // Block direct communication between customers and suppliers (except admin)
          if (currentUser.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: You can only communicate with admin" });
          }
          // Admin can communicate with anyone
        }

        // Get messages between current user and specified user
        const messages = await storage.getMessagesBetweenUsers(currentUser.id, otherUserId);
        res.json(messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
      }
    });

    // Send message with optional file attachments
    app.post("/api/chat/messages", authenticateToken, upload.array('attachments', 5), async (req, res) => {
      try {
        const { receiverId, content, relatedType, relatedId } = req.body;
        const senderId = req.user.id;

        let actualReceiverId = receiverId;
        
        // Security: Only allow communication with admin for non-admin users
        if (receiverId === 'admin') {
          const adminUser = await storage.getUserByEmail('vineeth@stone-flake.com');
          if (!adminUser) {
            return res.status(404).json({ message: "Admin user not found" });
          }
          actualReceiverId = adminUser.id;
        } else {
          // Block direct communication between customers and suppliers (except admin)
          if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: You can only send messages to admin" });
          }
          // Admin can send messages to anyone
        }

        // Create message
        const message = await storage.createMessage({
          senderId,
          receiverId: actualReceiverId,
          content,
          relatedType: relatedType || undefined,
          relatedId: relatedId || undefined,
        });

        // Handle file attachments if any
        const attachments = [];
        if (req.files && req.files.length > 0) {
          for (const file of req.files as Express.Multer.File[]) {
            const attachment = await storage.createMessageAttachment({
              messageId: message.id,
              fileName: file.filename,
              originalName: file.originalname,
              fileSize: file.size,
              mimeType: file.mimetype,
              filePath: file.path,
            });
            attachments.push(attachment);
          }
        }

        // Create notification for receiver
        await storage.createNotification({
          userId: actualReceiverId,
          type: "message",
          title: "New Message",
          message: `You have a new message from ${req.user.name}`,
          relatedId: message.id,
        });

        res.json({ 
          success: true, 
          message: { ...message, attachments },
          messageText: "Message sent successfully" 
        });
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    });

    // Get list of suppliers for chat (admin only)
    app.get("/api/admin/chat/suppliers", authenticateToken, requireAdmin, async (req, res) => {
      try {
        const suppliers = await storage.getAllSuppliers();
        res.json(suppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          company: supplier.companyNameInput || 'N/A'
        })));
      } catch (error) {
        console.error("Error fetching suppliers for chat:", error);
        res.status(500).json({ message: "Failed to fetch suppliers" });
      }
    });

    // Get admin user information (for chat purposes)
    app.get("/api/admin/user", authenticateToken, requireAdmin, async (req, res) => {
      try {
        const admin = await storage.getUserByEmail('vineeth@stone-flake.com');
        if (!admin) {
          return res.status(404).json({ message: "Admin user not found" });
        }
        res.json({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          isAdmin: admin.isAdmin
        });
      } catch (error) {
        console.error("Error fetching admin user:", error);
        res.status(500).json({ message: "Failed to fetch admin user" });
      }
    });

    // ===== THREAD-BASED MESSAGING ROUTES =====
    
    // Get all message threads for a user
    app.get("/api/messages/threads", authenticateToken, async (req, res) => {
      try {
        const threads = await storage.getMessageThreads(req.user.id);
        res.json(threads);
      } catch (error) {
        console.error("Error fetching message threads:", error);
        res.status(500).json({ message: "Failed to fetch message threads" });
      }
    });

    // Get messages for a specific thread
    app.get("/api/messages/threads/:threadId", authenticateToken, async (req, res) => {
      try {
        const { threadId } = req.params;
        const messages = await storage.getMessagesByThreadId(threadId);
        
        // Mark messages as read for the current user
        await storage.markThreadAsRead(threadId, req.user.id);
        
        res.json(messages);
      } catch (error) {
        console.error("Error fetching thread messages:", error);
        res.status(500).json({ message: "Failed to fetch thread messages" });
      }
    });

    // Send message to a thread (or create new thread)
    app.post("/api/messages/threads", authenticateToken, upload.array('attachments', 5), async (req, res) => {
      try {
        const { receiverId, content, category, subject } = req.body;
        const senderId = req.user.id;

        let actualReceiverId = receiverId;
        
        // Handle admin receiver ID resolution
        if (receiverId === 'admin') {
          const adminUser = await storage.getUserByEmail('vineeth@stone-flake.com');
          if (!adminUser) {
            return res.status(404).json({ message: "Admin user not found" });
          }
          actualReceiverId = adminUser.id;
        } else {
          // Non-admin users can only message admin
          if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: You can only send messages to admin" });
          }
        }

        // Find existing thread or generate new thread ID
        let threadId = await storage.findExistingThread(senderId, actualReceiverId);
        if (!threadId) {
          threadId = storage.generateThreadId(senderId, actualReceiverId, category || 'general');
        }

        // Create message
        const message = await storage.createMessage({
          senderId,
          receiverId: actualReceiverId,
          content,
          threadId,
          category: category || 'general',
          subject: subject || `${(category || 'general').charAt(0).toUpperCase() + (category || 'general').slice(1)} Discussion`,
        });

        // Handle file attachments if any
        const attachments = [];
        if (req.files && req.files.length > 0) {
          for (const file of req.files as Express.Multer.File[]) {
            const attachment = await storage.createMessageAttachment({
              messageId: message.id,
              fileName: file.filename,
              originalName: file.originalname,
              fileSize: file.size,
              mimeType: file.mimetype,
              filePath: file.path,
            });
            attachments.push(attachment);
          }
        }

        // Create notification for receiver
        await storage.createNotification({
          userId: actualReceiverId,
          type: "message",
          title: "New Message",
          message: `You have a new message from ${req.user.name} in ${subject || category || 'general'}`,
          relatedId: message.id,
        });

        res.json({ 
          success: true, 
          message: { ...message, attachments },
          messageText: "Message sent successfully" 
        });
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    });

    // Download message attachment
    app.get('/api/attachments/:attachmentId', authenticateToken, async (req: any, res) => {
      try {
        const { attachmentId } = req.params;
        
        // Get attachment info
        const attachment = await storage.getMessageAttachment(attachmentId);
        if (!attachment) {
          return res.status(404).json({ message: 'Attachment not found' });
        }

        // Get message to verify access permissions
        const message = await storage.getMessageById(attachment.messageId);
        if (!message) {
          return res.status(404).json({ message: 'Message not found' });
        }

        // Check if user has access to this message (sender, receiver, or admin)
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        const hasAccess = isAdmin || message.senderId === userId || message.receiverId === userId;
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Check if file exists
        const fs = await import('fs');
        const path = await import('path');
        
        if (!fs.existsSync(attachment.filePath)) {
          return res.status(404).json({ message: 'File not found' });
        }

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('Content-Length', attachment.fileSize);

        // Stream the file
        const fileStream = fs.createReadStream(attachment.filePath);
        fileStream.pipe(res);
      } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ message: 'Failed to download attachment' });
      }
    });

  // Upload invoice for purchase order (supplier endpoint)
  app.post('/api/purchase-orders/:poId/upload-invoice', authenticateToken, requireSupplier, upload.single('invoice'), async (req: any, res) => {
    try {
      const { poId } = req.params;
      const supplierId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ message: 'Invoice file is required' });
      }
      
      // Get the purchase order and verify supplier access
      const po = await storage.getPurchaseOrderById(poId);
      if (!po || po.supplierId !== supplierId) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Only allow invoice upload for delivered/completed orders
      if (po.status !== 'delivered' && po.status !== 'completed') {
        return res.status(400).json({ message: 'Invoice can only be uploaded for delivered or completed orders' });
      }
      
      const invoiceFileUrl = `/${req.file.path}`;
      
      // Update purchase order with invoice
      await storage.updatePurchaseOrder(poId, {
        supplierInvoiceUrl: invoiceFileUrl,
        invoiceUploadedAt: new Date(),
      });
      
      // Notify admin about invoice upload
      const adminUsers = await storage.getAllCustomers();
      const admins = adminUsers.filter(u => u.isAdmin);
      
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: 'status_update',
          title: 'Supplier Invoice Uploaded',
          message: `Supplier has uploaded invoice for purchase order ${po.orderNumber}`,
          relatedId: poId
        });
      }
      
      res.json({ success: true, message: 'Invoice uploaded successfully' });
    } catch (error) {
      console.error('Upload invoice error:', error);
      res.status(500).json({ message: 'Failed to upload invoice' });
    }
  });

  // Mark purchase order as completed and archived (admin endpoint)
  app.patch('/api/admin/purchase-orders/:poId/complete', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { poId } = req.params;
      
      const po = await storage.getPurchaseOrderById(poId);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Update status to completed/archived
      await storage.updatePurchaseOrder(poId, {
        status: 'completed',
        paymentCompletedAt: new Date(),
      });
      
      // Notify supplier about completion
      await storage.createNotification({
        userId: po.supplierId,
        type: 'status_update',
        title: 'Purchase Order Completed',
        message: `Purchase order ${po.orderNumber} has been completed and payment processed`,
        relatedId: poId
      });
      
      res.json({ success: true, message: 'Purchase order marked as completed' });
    } catch (error) {
      console.error('Complete purchase order error:', error);
      res.status(500).json({ message: 'Failed to complete purchase order' });
    }
  });

  // ===== ADMIN PURCHASE ORDER ROUTES =====

  // Get all purchase orders for admin
  app.get('/api/admin/purchase-orders', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const orders = await storage.getAllPurchaseOrders();
      res.json(orders);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      res.status(500).json({ message: 'Failed to fetch purchase orders' });
    }
  });

  // Create purchase order manually by admin
  app.post('/api/admin/purchase-orders', authenticateToken, requireAdmin, multer({ dest: 'uploads/' }).single('poFile'), async (req: any, res) => {
    try {
      const { supplierQuoteId, supplierId, totalAmount, deliveryDate, notes } = req.body;

      if (supplierQuoteId) {
        // Creating PO from accepted supplier quote
        const supplierQuote = await storage.getSupplierQuoteById(supplierQuoteId);
        if (!supplierQuote) {
          return res.status(404).json({ message: 'Supplier quote not found' });
        }

        const purchaseOrder = await storage.createPurchaseOrder({
          supplierQuoteId: supplierQuoteId,
          supplierId: supplierQuote.supplierId,
          rfqId: supplierQuote.rfqId,
          totalAmount: supplierQuote.price,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          notes: notes || null,
          poFileUrl: req.file ? req.file.path : null
        });

        // Get supplier and RFQ info for notifications
        const supplier = await storage.getUser(supplierQuote.supplierId);
        const rfq = await storage.getRFQById(supplierQuote.rfqId);
        
        if (supplier) {
          // Create notification
          await storage.createNotification({
            userId: supplier.id,
            type: 'order_confirmation',
            title: 'Purchase Order Created',
            message: `Purchase order ${purchaseOrder.orderNumber} has been created from your accepted quote.`,
            relatedId: purchaseOrder.id
          });

          // Send email notification
          if (rfq) {
            try {
              await emailService.sendPurchaseOrderNotification(
                supplier.email,
                supplier.name || 'Supplier',
                {
                  orderNumber: purchaseOrder.orderNumber,
                  projectName: rfq.projectName,
                  totalAmount: purchaseOrder.totalAmount.toString(),
                  deliveryDate: purchaseOrder.deliveryDate
                }
              );
            } catch (emailError) {
              console.error('Failed to send PO email notification:', emailError);
            }
          }
        }

        res.json({ 
          success: true, 
          purchaseOrder,
          message: "Purchase order created successfully" 
        });

      } else if (supplierId && totalAmount) {
        // Manual PO creation
        const purchaseOrder = await storage.createPurchaseOrder({
          supplierId,
          totalAmount: totalAmount.toString(),
          deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          notes: notes || undefined,
          poFileUrl: req.file ? req.file.path : null,
          supplierQuoteId: null,
          rfqId: null,
        });

        await storage.createNotification({
          userId: supplierId,
          type: "order_confirmation",
          title: "New Purchase Order",
          message: `A new purchase order ${purchaseOrder.orderNumber} has been created for you.`,
          relatedId: purchaseOrder.id,
        });

        res.json({ 
          success: true, 
          purchaseOrder,
          message: "Purchase order created successfully" 
        });
      } else {
        return res.status(400).json({ message: 'Either supplier quote ID or supplier ID and total amount are required' });
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({ message: 'Failed to create purchase order' });
    }
  });

  // Create chat session for purchase order
  app.post('/api/admin/purchase-orders/:orderId/chat', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      
      // Get the purchase order
      const purchaseOrder = await storage.getPurchaseOrderById(orderId);
      if (!purchaseOrder) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }

      // Create a chat session identifier using the PO number
      const chatId = `po-${purchaseOrder.orderNumber.toLowerCase()}`;
      
      // Return the chat ID - the frontend will handle opening the chat interface
      res.json({ 
        chatId,
        orderNumber: purchaseOrder.orderNumber,
        supplierId: purchaseOrder.supplierId
      });
    } catch (error) {
      console.error('Error creating chat session:', error);
      res.status(500).json({ message: 'Failed to create chat session' });
    }
  });

  // Get purchase orders for supplier
  app.get('/api/supplier/purchase-orders', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // Get all company users if user belongs to a supplier company
      let companyUsers = [currentUser.id];
      if (currentUser.companyId && currentUser.role === 'supplier') {
        console.log(`[DEBUG] Getting POs for supplier company users: getting users for company ${currentUser.companyId}`);
        const allCompanyUsers = await storage.getUsersByCompanyId(currentUser.companyId);
        companyUsers = allCompanyUsers
          .filter(user => user.role === 'supplier')
          .map(user => user.id);
        console.log(`[DEBUG] Getting POs for supplier company users: ${companyUsers.length} users - ${companyUsers.join(', ')}`);
      }
      
      // Get purchase orders for all company users
      const allPurchaseOrders = await Promise.all(
        companyUsers.map(userId => storage.getPurchaseOrdersBySupplierId(userId))
      );
      
      // Flatten and deduplicate by PO ID
      const flatPurchaseOrders = allPurchaseOrders.flat();
      const seenIds = new Set();
      const purchaseOrders = flatPurchaseOrders.filter(po => {
        if (seenIds.has(po.id)) {
          return false;
        }
        seenIds.add(po.id);
        return true;
      });
      
      // Add project names and related RFQ info
      const enhancedPOs = await Promise.all(
        purchaseOrders.map(async (po) => {
          let projectName = 'Manual Order';
          let material = null;
          let quantity = null;
          
          if (po.rfqId) {
            const rfq = await storage.getRFQById(po.rfqId);
            if (rfq) {
              projectName = rfq.projectName;
              material = rfq.material;
              quantity = rfq.quantity;
            }
          }
          
          return {
            ...po,
            projectName,
            material,
            quantity,
            archivedAt: po.archivedAt
          };
        })
      );
      
      // PRODUCTION DEBUG LOG
      console.log('PRODUCTION API DEBUG - Returning POs:', enhancedPOs.map(po => ({
        orderNumber: po.orderNumber,
        status: po.status,
        archivedAt: po.archivedAt,
        hasArchivedAt: !!po.archivedAt
      })));
      
      res.json(enhancedPOs);
    } catch (error) {
      console.error('Get supplier purchase orders error:', error);
      res.status(500).json({ message: 'Failed to fetch purchase orders' });
    }
  });

  // Get all purchase orders for admin
  app.get('/api/admin/purchase-orders', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const purchaseOrders = await storage.getAllPurchaseOrders();
      
      // Transform to match frontend interface expectations
      const enhancedPOs = purchaseOrders.map((po) => {
        const projectName = po.rfq?.title || po.rfq?.projectName || 'Manual Order';
        const material = po.rfq?.material || null;
        const quantity = po.rfq?.quantity || null;
        const supplierName = po.supplier?.name || 'Unknown Supplier';
        let supplierCompany = '';
        
        // Try to get company name from supplier if available
        if (po.supplier?.companyNameInput) {
          supplierCompany = po.supplier.companyNameInput;
        } else if (po.supplier?.company?.name) {
          supplierCompany = po.supplier.company.name;
        }
        
        // Get supplier vendor number
        const supplierVendorNumber = po.supplier?.vendorNumber || 'N/A';
        
        return {
          id: po.id,
          orderNumber: po.orderNumber,
          supplierId: po.supplierId,
          supplierName,
          supplierCompany,
          supplierVendorNumber,
          projectName,
          material,
          materialGrade: po.rfq?.materialGrade || null,
          finishing: po.rfq?.finishing || null,
          tolerance: po.rfq?.tolerance || null,
          quantity,
          totalAmount: po.totalAmount,
          deliveryDate: po.deliveryDate,
          status: po.status,
          notes: po.notes,
          poFileUrl: po.poFileUrl,
          supplierInvoiceUrl: po.supplierInvoiceUrl,
          invoiceUploadedAt: po.invoiceUploadedAt,
          createdAt: po.createdAt,
          acceptedAt: po.acceptedAt,
          archivedAt: po.archivedAt
        };
      });
      
      res.json(enhancedPOs);
    } catch (error) {
      console.error('Error fetching admin purchase orders:', error);
      res.status(500).json({ message: 'Failed to fetch purchase orders' });
    }
  });

  // Accept purchase order (supplier endpoint)
  app.patch('/api/purchase-orders/:poId/accept', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const { poId } = req.params;
      const currentUser = req.user;
      
      const po = await storage.getPurchaseOrderById(poId);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Check if user has access (direct supplier or same company)
      let hasAccess = po.supplierId === currentUser.id;
      
      if (!hasAccess && currentUser.companyId && currentUser.role === 'supplier') {
        // Check if the PO supplier belongs to the same company
        const poSupplier = await storage.getUser(po.supplierId);
        if (poSupplier && poSupplier.companyId === currentUser.companyId) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (po.status !== 'pending') {
        return res.status(400).json({ message: 'Purchase order is not in pending status' });
      }
      
      await storage.acceptPurchaseOrder(poId);
      
      res.json({ 
        success: true, 
        message: 'Purchase order accepted successfully',
        status: 'accepted'
      });
    } catch (error) {
      console.error('Accept PO error:', error);
      res.status(500).json({ message: 'Failed to accept purchase order' });
    }
  });

  // Reject purchase order (supplier endpoint)
  app.patch('/api/purchase-orders/:poId/reject', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const { poId } = req.params;
      const currentUser = req.user;
      
      const po = await storage.getPurchaseOrderById(poId);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Check if user has access (direct supplier or same company)
      let hasAccess = po.supplierId === currentUser.id;
      
      if (!hasAccess && currentUser.companyId && currentUser.role === 'supplier') {
        // Check if the PO supplier belongs to the same company
        const poSupplier = await storage.getUser(po.supplierId);
        if (poSupplier && poSupplier.companyId === currentUser.companyId) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (po.status !== 'pending') {
        return res.status(400).json({ message: 'Purchase order is not in pending status' });
      }
      
      await storage.rejectPurchaseOrder(poId);
      
      res.json({
        success: true,
        message: 'Purchase order rejected successfully',
        status: 'declined'
      });
    } catch (error) {
      console.error('Reject PO error:', error);
      res.status(500).json({ message: 'Failed to reject purchase order' });
    }
  });

  // Archive purchase order (admin endpoint)
  app.patch('/api/admin/purchase-orders/:poId/archive', authenticateToken, requireAdmin, async (req: any, res) => {
    console.log('=== ARCHIVE REQUEST RECEIVED ===');
    console.log('PO ID:', req.params.poId);
    try {
      const { poId } = req.params;
      
      const po = await storage.getPurchaseOrderById(poId);
      console.log('Found PO:', po?.orderNumber, 'Status:', po?.status);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      if (po.status !== 'delivered') {
        console.log('Status check failed - not delivered');
        return res.status(400).json({ message: 'Only delivered purchase orders can be archived' });
      }
      
      console.log('About to archive PO...');
      
      // Simple update using storage method
      await storage.updatePurchaseOrder(poId, {
        status: 'archived' as any,
        archivedAt: new Date()
      });
      
      console.log('Storage update completed');
      
      // Verify the update worked
      const updatedPO = await storage.getPurchaseOrderById(poId);
      console.log('After update - Status:', updatedPO?.status, 'ArchivedAt:', updatedPO?.archivedAt);
      
      res.json({ 
        success: true, 
        message: 'Purchase order archived successfully',
        status: 'archived'
      });
    } catch (error) {
      console.error('=== ARCHIVE ERROR ===');
      console.error('Archive PO error:', error);
      res.status(500).json({ message: 'Failed to archive purchase order' });
    }
  });

  // Get all sales orders for admin (customer-to-admin orders)
  app.get('/api/admin/sales-orders', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const salesOrdersList = await db
        .select({
          id: salesOrders.id,
          orderNumber: salesOrders.orderNumber,
          userId: salesOrders.userId,
          customerName: users.name,
          customerCompany: sql<string>`COALESCE(${companies.name}, ${users.companyNameInput}, 'No Company Name')`,
          customerNumber: companies.customerNumber,
          projectName: salesOrders.projectName,
          material: salesOrders.material,
          materialGrade: salesOrders.materialGrade,
          finishing: salesOrders.finishing,
          tolerance: salesOrders.tolerance,
          quantity: salesOrders.quantity,
          amount: salesOrders.amount,
          orderStatus: salesOrders.orderStatus,
          paymentStatus: salesOrders.paymentStatus,
          customerPurchaseOrderNumber: salesOrders.customerPurchaseOrderNumber,
          estimatedCompletion: salesOrders.estimatedCompletion,
          archivedAt: salesOrders.archivedAt,
          orderDate: salesOrders.orderDate,
        })
        .from(salesOrders)
        .leftJoin(users, eq(salesOrders.userId, users.id))
        .leftJoin(companies, eq(users.companyId, companies.id))
        .orderBy(desc(salesOrders.orderDate));

      res.json(salesOrdersList);
    } catch (error) {
      console.error('Get sales orders error:', error);
      res.status(500).json({ message: 'Failed to fetch sales orders' });
    }
  });

  // Upload supplier invoice for purchase order (supplier specific endpoint)
  app.post('/api/supplier/purchase-orders/upload-invoice', authenticateToken, requireSupplier, upload.single('invoice'), async (req: any, res) => {
    try {
      const { poId } = req.body;
      const supplierId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ message: 'Invoice file is required' });
      }

      // Validate file type - must be PDF
      const originalExt = path.extname(req.file.originalname).toLowerCase();
      if (originalExt !== '.pdf') {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Failed to remove invalid file:', e);
        }
        return res.status(400).json({ message: 'Only PDF files are allowed for invoices' });
      }

      // Additional validation: check if file content is actually a PDF
      const fileBuffer = fs.readFileSync(req.file.path);
      const isPDF = fileBuffer.toString('utf8', 0, 4) === '%PDF';
      
      if (!isPDF) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Failed to remove invalid file:', e);
        }
        return res.status(400).json({ message: 'File content is not a valid PDF' });
      }
      
      // Get the purchase order and verify ownership
      const po = await storage.getPurchaseOrderById(poId);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      if (po.supplierId !== supplierId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (po.status !== 'delivered') {
        return res.status(400).json({ message: 'Invoices can only be uploaded for delivered orders' });
      }
      
      const invoiceUrl = `/uploads/${path.basename(req.file.path)}`;
      
      // Update purchase order with invoice
      await storage.updatePurchaseOrder(poId, {
        supplierInvoiceUrl: invoiceUrl,
        invoiceUploadedAt: new Date(),
      });

      res.json({ success: true, message: 'Invoice uploaded successfully', invoiceUrl });
    } catch (error) {
      console.error('Invoice upload error:', error);
      res.status(500).json({ message: 'Failed to upload invoice' });
    }
  });

  // Upload supplier invoice for purchase order (legacy endpoint)
  app.post('/api/purchase-orders/:poId/upload-invoice', authenticateToken, requireSupplier, upload.single('invoice'), async (req: any, res) => {
    try {
      const { poId } = req.params;
      const supplierId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ message: 'Invoice file is required' });
      }

      // Validate file type - must be PDF
      const originalExt = path.extname(req.file.originalname).toLowerCase();
      if (originalExt !== '.pdf') {
        // Remove the uploaded file if it's not a PDF
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Failed to remove invalid file:', e);
        }
        return res.status(400).json({ message: 'Only PDF files are allowed for invoices' });
      }

      // Additional validation: check if file content is actually a PDF
      const fileBuffer = fs.readFileSync(req.file.path);
      const isPDF = fileBuffer.toString('utf8', 0, 4) === '%PDF';
      
      if (!isPDF) {
        // Remove the uploaded file if it's not actually a PDF
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Failed to remove invalid file:', e);
        }
        return res.status(400).json({ message: 'File content is not a valid PDF' });
      }
      
      // Get the purchase order and verify ownership
      const po = await storage.getPurchaseOrderById(poId);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      if (po.supplierId !== supplierId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (po.status !== 'delivered') {
        return res.status(400).json({ message: 'Invoices can only be uploaded for delivered orders' });
      }
      
      const invoiceUrl = `/uploads/${path.basename(req.file.path)}`;
      
      // Update purchase order with invoice
      await storage.updatePurchaseOrder(poId, {
        supplierInvoiceUrl: invoiceUrl,
        invoiceUploadedAt: new Date(),
      });

      res.json({ success: true, message: 'Invoice uploaded successfully', invoiceUrl });
    } catch (error) {
      console.error('Invoice upload error:', error);
      res.status(500).json({ message: 'Failed to upload invoice' });
    }
  });

  // Admin download supplier invoice
  app.get('/api/admin/purchase-orders/:poId/invoice', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { poId } = req.params;
      
      // Get the purchase order
      const po = await storage.getPurchaseOrderById(poId);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      if (!po.supplierInvoiceUrl) {
        return res.status(404).json({ message: 'No invoice uploaded for this purchase order' });
      }
      
      // Construct the file path (remove leading slash if present)
      const filePath = path.join(process.cwd(), po.supplierInvoiceUrl.startsWith('/') ? po.supplierInvoiceUrl.substring(1) : po.supplierInvoiceUrl);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Invoice file not found on server' });
      }
      
      // Set appropriate headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice_${po.orderNumber}.pdf"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming invoice file:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming invoice file' });
        }
      });
      
    } catch (error) {
      console.error('Download invoice error:', error);
      res.status(500).json({ message: 'Failed to download invoice' });
    }
  });

  // Download PO file
  app.get('/api/purchase-orders/:poId/file', authenticateToken, async (req: any, res) => {
    try {
      const { poId } = req.params;
      const po = await storage.getPurchaseOrderById(poId);
      
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Check if user has access (admin or the supplier)
      if (req.user.role !== 'admin' && req.user.id !== po.supplierId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (!po.poFileUrl) {
        return res.status(404).json({ message: 'No file attached to this purchase order' });
      }
      
      // Serve the file
      const filePath = path.resolve(po.poFileUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      res.download(filePath);
    } catch (error) {
      console.error('Download PO file error:', error);
      res.status(500).json({ message: 'Failed to download file' });
    }
  });

  // Supplier purchase order tracking status update
  app.patch('/api/supplier/purchase-orders/:id/status', authenticateToken, requireSupplier, async (req: any, res) => {
    try {
      const { status } = req.body;
      const poId = req.params.id;
      const currentUser = req.user;

      // Verify the PO exists and check company access
      const po = await storage.getPurchaseOrderById(poId);
      if (!po) {
        return res.status(404).json({ message: 'Purchase order not found or access denied' });
      }

      // Check if user has access (direct supplier or same company)
      let hasAccess = po.supplierId === currentUser.id;
      
      if (!hasAccess && currentUser.companyId && currentUser.role === 'supplier') {
        // Check if the PO supplier belongs to the same company
        const poSupplier = await storage.getUser(po.supplierId);
        if (poSupplier && poSupplier.companyId === currentUser.companyId) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(404).json({ message: 'Purchase order not found or access denied' });
      }

      // Validate status transition
      const validStatuses = [
        'pending', 'accepted', 'declined', 'material_procurement', 
        'manufacturing', 'finishing', 'quality_check', 'packing', 
        'shipped', 'delivered'
      ];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }

      await storage.updatePurchaseOrderStatus(poId, status);

      res.json({ success: true, message: 'Purchase order status updated successfully' });
    } catch (error) {
      console.error('Purchase order status update error:', error);
      res.status(500).json({ message: 'Failed to update purchase order status' });
    }
  });

  // Profile endpoints
  app.get('/api/profile', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get company information if user is linked to a company
      let companyInfo = null;
      let customerNumber = null;
      if (user.companyId) {
        companyInfo = await storage.getCompanyById(user.companyId);
        customerNumber = companyInfo?.companyNumber; // Use companyNumber field from Drizzle schema
      }
      
      // Return user profile with the expected fields
      res.json({
        id: user.id,
        customerNumber: customerNumber, // Add the proper customer number
        email: user.email,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        companyName: companyInfo?.name || user.companyNameInput, // Use official company name if linked
        companyNameInput: user.companyNameInput, // Include the original company name input
        userNumber: user.userNumber, // Include user number for all users
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.postalCode, // Map postalCode from database to zipCode for frontend
        country: user.country,
        businessType: user.businessType,
        industryFocus: user.industryFocus,
        companySize: user.companySize,
        website: user.website,
        notes: user.notes,
        jobTitle: user.jobTitle,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        role: user.role // Include user role
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Failed to get profile' });
    }
  });

  app.put('/api/profile', authenticateToken, async (req: any, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        companyName, 
        phone, 
        address, 
        city, 
        state, 
        zipCode, 
        country,
        businessType,
        industryFocus,
        companySize,
        website,
        notes,
        jobTitle
      } = req.body;
      
      // Update user profile
      const fullName = `${firstName || ''} ${lastName || ''}`.trim();
      const updated = await storage.updateUserProfile(req.user.id, {
        name: fullName,
        companyNameInput: companyName,
        phone,
        address,
        city,
        state,
        postalCode: zipCode, // Map zipCode from frontend to postalCode in database
        country,
        businessType,
        industryFocus,
        companySize,
        website,
        notes,
        jobTitle
      });
      
      if (!updated) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Get unread message count for user
  app.get('/api/messages/unread-count', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const threads = await storage.getMessageThreads(currentUser.id);
      const totalUnreadCount = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
      
      res.json({ unreadCount: totalUnreadCount });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ message: 'Failed to get unread count' });
    }
  });

  // Messages endpoints (placeholder implementation)
  app.get('/api/messages/threads', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      // Security: Only customers can access customer messaging endpoints
      if (currentUser.role === 'customer') {
        const adminUser = await storage.getUserByEmail('vineeth@stone-flake.com');
        if (!adminUser) {
          return res.status(404).json({ message: "Admin user not found" });
        }
        
        // Get messages between current user and admin
        const messages = await storage.getMessagesBetweenUsers(currentUser.id, adminUser.id);
        
        // Return as threads format expected by customer portal
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1]; // Get most recent message
          const senderName = lastMessage?.sender?.name || 'Admin';
          const nameParts = senderName.split(' ');
          
          console.log('Customer portal API - lastMessage structure:', {
            id: lastMessage?.id,
            content: lastMessage?.content,
            sender: lastMessage?.sender,
            senderId: lastMessage?.senderId
          });
          
          // Ensure proper structure for fromUser
          const fromUserData = {
            id: lastMessage?.senderId || adminUser.id,
            firstName: nameParts[0] || 'Admin',
            lastName: nameParts[1] || '',
            email: lastMessage?.sender?.email || 'admin@stone-flake.com',
            role: lastMessage?.sender?.role || 'admin'
          };
          
          console.log('fromUser data structure:', fromUserData);
          
          const responseData = [{
            threadId: 'admin-thread', // Use threadId to match console logs
            id: 'admin-thread',
            subject: lastMessage?.subject || 'Support Conversation',
            lastMessage: {
              id: lastMessage.id,
              subject: lastMessage?.subject || 'Support Conversation',
              content: lastMessage?.content || 'No messages',
              fromUser: fromUserData,
              toUser: {
                id: currentUser.id,
                firstName: currentUser.name?.split(' ')[0] || 'Customer',
                lastName: currentUser.name?.split(' ')[1] || '',
                email: currentUser.email,
                role: currentUser.role
              },
              isRead: lastMessage?.isRead || false,
              priority: 'normal' as const,
              category: lastMessage?.category || 'general' as const,
              createdAt: lastMessage?.createdAt || new Date(),
              updatedAt: lastMessage?.createdAt || new Date()
            },
            messageCount: messages.length,
            participants: [{
              id: adminUser.id,
              firstName: 'Admin',
              lastName: '',
              role: 'admin'
            }],
            isRead: lastMessage?.isRead || false,
            updatedAt: lastMessage?.createdAt || new Date()
          }];
          
          console.log('Final API response structure:', JSON.stringify(responseData[0].lastMessage.fromUser, null, 2));
          res.json(responseData);
        } else {
          res.json([]);
        }
      } else {
        // Block non-customers from accessing customer messaging
        return res.status(403).json({ message: "Access denied: Customer messaging only" });
      }
    } catch (error) {
      console.error('Get message threads error:', error);
      res.status(500).json({ message: 'Failed to get message threads' });
    }
  });

  app.get('/api/messages/threads/:threadId', authenticateToken, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { threadId } = req.params;
      
      // For customers, threadId should be 'admin-thread'
      if (currentUser.role === 'customer' && threadId === 'admin-thread') {
        const adminUser = await storage.getUserByEmail('vineeth@stone-flake.com');
        if (!adminUser) {
          return res.status(404).json({ message: "Admin user not found" });
        }
        
        // Get messages between current user and admin
        const messages = await storage.getMessagesBetweenUsers(currentUser.id, adminUser.id);
        
        // Format messages for customer portal
        const formattedMessages = messages.map(msg => {
          const senderName = msg.sender?.name || 'Unknown';
          const nameParts = senderName.split(' ');
          
          return {
            id: msg.id,
            subject: 'Support Conversation',
            content: msg.content,
            fromUser: {
              id: msg.senderId,
              firstName: nameParts[0] || 'Unknown',
              lastName: nameParts[1] || '',
              email: msg.sender?.email || 'unknown@example.com',
              role: msg.sender?.role || 'unknown'
            },
            toUser: {
              id: msg.receiverId,
              firstName: currentUser.name?.split(' ')[0] || 'Customer',
              lastName: currentUser.name?.split(' ')[1] || '',
              email: currentUser.email,
              role: currentUser.role
            },
            isRead: msg.isRead,
            priority: 'normal' as const,
            category: 'general' as const,
            attachments: [],
            createdAt: msg.createdAt,
            updatedAt: msg.createdAt
          };
        });
        
        res.json(formattedMessages);
      } else {
        // Block non-customers from accessing customer thread messages
        return res.status(403).json({ message: "Access denied: Customer messaging only" });
      }
    } catch (error) {
      console.error('Get thread messages error:', error);
      res.status(500).json({ message: 'Failed to get thread messages' });
    }
  });

  app.post('/api/messages', authenticateToken, async (req: any, res) => {
    try {
      const { subject, content, priority, category = 'general' } = req.body;
      const senderId = req.user.id;
      
      // Find admin user to send message to
      const adminUser = await storage.getUserByEmail('vineeth@stone-flake.com');
      if (!adminUser) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      // Security: Only customers can send messages via customer portal
      if (req.user.role !== 'customer') {
        return res.status(403).json({ message: "Access denied: Customer messaging only" });
      }
      
      // Generate thread ID for the category
      const threadId = storage.generateThreadId(senderId, adminUser.id, category);
      
      // Create message with thread support
      const message = await storage.createMessage({
        senderId,
        receiverId: adminUser.id,
        content,
        subject,
        category,
        threadId,
        relatedType: category || undefined,
      });
      
      // Create notification for admin
      await storage.createNotification({
        userId: adminUser.id,
        type: "message",
        title: "New Customer Message",
        message: `You have a new ${category} message from ${req.user.name}`,
        relatedId: message.id,
      });
      
      res.json({ 
        success: true, 
        message: 'Message sent successfully',
        id: message.id,
        threadId
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.put('/api/messages/threads/:threadId/read', authenticateToken, async (req: any, res) => {
    try {
      const { threadId } = req.params;
      const userId = req.user.id;
      
      await storage.markThreadAsRead(threadId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Mark thread as read error:', error);
      res.status(500).json({ message: 'Failed to mark thread as read' });
    }
  });

  // =====================
  // ADMIN MESSAGING ENDPOINTS
  // =====================

  // Get all users for admin to create new conversations
  app.get("/api/admin/all-users", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsersForAdmin();
      res.json(users);
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get all thread conversations for admin
  app.get("/api/admin/messages/conversations", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const adminUser = await storage.getUserByEmail('vineeth@stone-flake.com');
      if (!adminUser) {
        return res.status(404).json({ error: 'Admin user not found' });
      }

      const threads = await storage.getMessageThreads(adminUser.id);
      
      // Format threads for admin interface
      const conversations = threads.map(thread => ({
        threadId: thread.threadId,
        userId: thread.otherUser.id,
        userName: thread.otherUser.name || 'Unknown',
        userEmail: thread.otherUser.email,
        userRole: thread.otherUser.role,
        userCompany: thread.otherUser.company || undefined,
        customerNumber: thread.otherUser.customerNumber || undefined,
        userNumber: thread.otherUser.userNumber || undefined,
        subject: thread.subject,
        category: thread.category,
        lastMessage: thread.lastMessage,
        unreadCount: thread.unreadCount
      }));
      
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching admin conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Get messages for specific thread
  app.get("/api/admin/messages/thread/:threadId", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { threadId } = req.params;
      const messages = await storage.getMessagesByThreadId(threadId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      res.status(500).json({ error: 'Failed to fetch thread messages' });
    }
  });

  // Send message to thread
  app.post("/api/admin/messages/send", authenticateToken, requireAdmin, upload.array('attachments', 5), async (req: any, res) => {
    try {
      const { threadId, userId, content, category = 'general', subject } = req.body;
      
      if (!content?.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const adminUser = await storage.getUserByEmail('vineeth@stone-flake.com');
      if (!adminUser) {
        return res.status(404).json({ error: 'Admin user not found' });
      }

      // If no threadId provided, create new thread
      const finalThreadId = threadId || storage.generateThreadId(adminUser.id, userId, category);

      const message = await storage.createMessage({
        content: content.trim(),
        senderId: adminUser.id,
        receiverId: userId,
        threadId: finalThreadId,
        category,
        subject: subject || undefined,
        isRead: false,
        createdAt: new Date()
      });

      // Handle file attachments if any
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await storage.createMessageAttachment({
            messageId: message.id,
            fileName: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            filePath: file.path
          });
        }
      }

      res.json({ success: true, message, threadId: finalThreadId });
    } catch (error) {
      console.error('Error sending admin message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Mark thread as read
  app.put("/api/admin/messages/thread/:threadId/read", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { threadId } = req.params;
      const adminUser = await storage.getUserByEmail('vineeth@stone-flake.com');
      if (!adminUser) {
        return res.status(404).json({ error: 'Admin user not found' });
      }

      await storage.markThreadAsRead(threadId, adminUser.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking thread as read:', error);
      res.status(500).json({ error: 'Failed to mark thread as read' });
    }
  });

  // =====================
  // CUSTOMER COMPANY MANAGEMENT ENDPOINTS
  // =====================

  // Get all customer companies
  app.get('/api/admin/customer-companies', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const companies = await storage.getCompaniesByType('customer');
      res.json(companies);
    } catch (error) {
      console.error('Get customer companies error:', error);
      res.status(500).json({ message: 'Failed to fetch customer companies' });
    }
  });

  // Create new customer company
  app.post('/api/admin/customer-companies', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const company = await storage.createCompany({ ...req.body, companyType: 'customer' });
      res.json(company);
    } catch (error) {
      console.error('Create customer company error:', error);
      res.status(500).json({ message: 'Failed to create customer company' });
    }
  });

  // Update customer company
  app.put('/api/admin/customer-companies/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      await storage.updateCompany(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Update customer company error:', error);
      res.status(500).json({ message: 'Failed to update customer company' });
    }
  });

  // Assign customer number to customer company
  app.post('/api/admin/customer-companies/:companyId/assign-number', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const { customerNumber } = req.body;

      if (!customerNumber || !customerNumber.match(/^CU\d{4}$/)) {
        return res.status(400).json({ message: 'Invalid customer number format. Use CU0001 format.' });
      }

      // Check if company exists
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Check if customer number is available (unless it's the same company)
      if (company.companyNumber !== customerNumber) {
        const isAvailable = await storage.isCustomerNumberAvailable(customerNumber);
        if (!isAvailable) {
          return res.status(400).json({ message: 'Customer number is already assigned to another company' });
        }
      }

      // Assign the customer number
      await storage.assignCustomerNumber(companyId, customerNumber);
      
      res.json({ success: true, message: 'Customer number assigned successfully' });
    } catch (error) {
      console.error('Assign customer number error:', error);
      res.status(500).json({ message: 'Failed to assign customer number' });
    }
  });

  // Merge customer companies
  app.post('/api/admin/customer-companies/merge', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      console.log('🔄 Merge request received:', req.body);
      const { primaryCompanyId, companiesToMerge, finalCustomerNumber, finalCompanyName } = req.body;

      // Validate input
      if (!primaryCompanyId || !Array.isArray(companiesToMerge) || companiesToMerge.length < 2) {
        console.log('❌ Invalid merge parameters:', { primaryCompanyId, companiesToMerge });
        return res.status(400).json({ message: 'Invalid merge parameters' });
      }

      if (!finalCustomerNumber || !finalCustomerNumber.match(/^CU\d{4}$/)) {
        console.log('❌ Invalid customer number format:', finalCustomerNumber);
        return res.status(400).json({ message: 'Invalid customer number format. Use CU0001 format.' });
      }

      if (!finalCompanyName || finalCompanyName.trim().length < 2) {
        console.log('❌ Invalid company name:', finalCompanyName);
        return res.status(400).json({ message: 'Final company name is required' });
      }

      // Validate that primaryCompanyId is in the list of companies to merge
      if (!companiesToMerge.includes(primaryCompanyId)) {
        console.log('❌ Primary company not in merge list:', { primaryCompanyId, companiesToMerge });
        return res.status(400).json({ message: 'Primary company must be included in companies to merge' });
      }

      console.log('✅ Validation passed, checking companies exist...');

      // Get primary company to verify it exists
      const primaryCompany = await storage.getCompanyById(primaryCompanyId);
      if (!primaryCompany) {
        console.log('❌ Primary company not found:', primaryCompanyId);
        return res.status(404).json({ message: 'Primary company not found' });
      }

      console.log('✅ Primary company found:', primaryCompany.name);

      // Check if the final customer number is available (unless it's already assigned to one of the merging companies)
      const companiesWithNumber = await Promise.all(
        companiesToMerge.map(async (id: string) => {
          try {
            return await storage.getCompanyById(id);
          } catch (error) {
            console.log('⚠️  Error getting company:', id, error);
            return null;
          }
        })
      );
      
      const hasExistingNumber = companiesWithNumber.some(c => c && c.companyNumber === finalCustomerNumber);
      
      if (!hasExistingNumber) {
        const isAvailable = await storage.isCustomerNumberAvailable(finalCustomerNumber);
        if (!isAvailable) {
          console.log('❌ Customer number already in use:', finalCustomerNumber);
          return res.status(400).json({ message: 'Final customer number is already assigned to another company' });
        }
      }

      console.log('✅ Customer number validation passed');

      console.log('🔄 Starting merge operations...');

      // Start transaction-like operations
      // 1. Update all users from secondary companies to point to primary company
      const secondaryCompanies = companiesToMerge.filter((id: string) => id !== primaryCompanyId);
      
      console.log('📋 Secondary companies to merge:', secondaryCompanies);

      for (const secondaryCompanyId of secondaryCompanies) {
        console.log(`🔄 Processing secondary company: ${secondaryCompanyId}`);
        
        try {
          // Move all users to primary company
          const userResult = await db.update(users)
            .set({ companyId: primaryCompanyId })
            .where(eq(users.companyId, secondaryCompanyId));
          console.log(`✅ Moved users from ${secondaryCompanyId} to ${primaryCompanyId}`);

          console.log(`ℹ️  RFQs are linked to companies through users, no direct move needed for ${secondaryCompanyId}`);
          console.log(`ℹ️  Sales orders are also linked to companies through users, no direct move needed for ${secondaryCompanyId}`);
        } catch (error) {
          console.error(`❌ Error processing company ${secondaryCompanyId}:`, error);
          throw error;
        }
      }

      console.log('🔄 Updating primary company details...');

      // 2. Update primary company with final details
      try {
        await db.update(companies)
          .set({ 
            name: finalCompanyName.trim(),
            companyNumber: finalCustomerNumber 
          })
          .where(eq(companies.id, primaryCompanyId));
        console.log(`✅ Updated primary company: ${finalCompanyName} (${finalCustomerNumber})`);
      } catch (error) {
        console.error('❌ Error updating primary company:', error);
        throw error;
      }

      console.log('🔄 Deleting secondary companies...');

      // 3. Delete secondary companies
      for (const secondaryCompanyId of secondaryCompanies) {
        try {
          await db.delete(companies)
            .where(eq(companies.id, secondaryCompanyId));
          console.log(`✅ Deleted secondary company: ${secondaryCompanyId}`);
        } catch (error) {
          console.error(`❌ Error deleting company ${secondaryCompanyId}:`, error);
          throw error;
        }
      }

      console.log('🎉 Merge completed successfully!');

      res.json({ 
        success: true, 
        message: `Successfully merged ${companiesToMerge.length} companies`,
        primaryCompanyId,
        finalCompanyName,
        finalCustomerNumber
      });
    } catch (error) {
      console.error('❌ Merge customer companies error:', error);
      res.status(500).json({ message: `Failed to merge companies: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // =====================
  // SUPPLIER COMPANY MANAGEMENT ENDPOINTS
  // =====================

  // Get all supplier companies
  app.get('/api/admin/supplier-companies', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const companies = await storage.getCompaniesByType('supplier');
      res.json(companies);
    } catch (error) {
      console.error('Get supplier companies error:', error);
      res.status(500).json({ message: 'Failed to fetch supplier companies' });
    }
  });

  // Create new supplier company
  app.post('/api/admin/supplier-companies', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const company = await storage.createCompany({ ...req.body, companyType: 'supplier' });
      res.json(company);
    } catch (error) {
      console.error('Create supplier company error:', error);
      res.status(500).json({ message: 'Failed to create supplier company' });
    }
  });

  // Update supplier company
  app.put('/api/admin/supplier-companies/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      await storage.updateCompany(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Update supplier company error:', error);
      res.status(500).json({ message: 'Failed to update supplier company' });
    }
  });

  // Assign vendor number to supplier company
  app.post('/api/admin/supplier-companies/:companyId/assign-number', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const { vendorNumber } = req.body;

      if (!vendorNumber || !vendorNumber.match(/^V\d{4}$/)) {
        return res.status(400).json({ message: 'Invalid vendor number format. Use V0001 format.' });
      }

      // Check if company exists
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Check if vendor number is available (unless it's the same company)
      if (company.companyNumber !== vendorNumber) {
        const isAvailable = await storage.isVendorNumberAvailable(vendorNumber);
        if (!isAvailable) {
          return res.status(400).json({ message: 'Vendor number is already assigned to another company' });
        }
      }

      // Assign the vendor number
      await storage.assignVendorNumber(companyId, vendorNumber);
      
      res.json({ success: true, message: 'Vendor number assigned successfully' });
    } catch (error) {
      console.error('Assign vendor number error:', error);
      res.status(500).json({ message: 'Failed to assign vendor number' });
    }
  });

  // Merge supplier companies
  app.post('/api/admin/supplier-companies/merge', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      console.log('🔄 Merge request received:', req.body);
      const { primaryCompanyId, companiesToMerge, finalVendorNumber, finalCompanyName } = req.body;

      // Validate input
      if (!primaryCompanyId || !Array.isArray(companiesToMerge) || companiesToMerge.length < 2) {
        console.log('❌ Invalid merge parameters:', { primaryCompanyId, companiesToMerge });
        return res.status(400).json({ message: 'Invalid merge parameters' });
      }

      if (!finalVendorNumber || !finalVendorNumber.match(/^V\d{4}$/)) {
        console.log('❌ Invalid vendor number format:', finalVendorNumber);
        return res.status(400).json({ message: 'Invalid vendor number format. Use V0001 format.' });
      }

      if (!finalCompanyName || finalCompanyName.trim().length < 2) {
        console.log('❌ Invalid company name:', finalCompanyName);
        return res.status(400).json({ message: 'Final company name is required' });
      }

      // Validate that primaryCompanyId is in the list of companies to merge
      if (!companiesToMerge.includes(primaryCompanyId)) {
        console.log('❌ Primary company not in merge list:', { primaryCompanyId, companiesToMerge });
        return res.status(400).json({ message: 'Primary company must be included in companies to merge' });
      }

      console.log('✅ Validation passed, checking companies exist...');

      // Get primary company to verify it exists
      const primaryCompany = await storage.getCompanyById(primaryCompanyId);
      if (!primaryCompany) {
        console.log('❌ Primary company not found:', primaryCompanyId);
        return res.status(404).json({ message: 'Primary company not found' });
      }

      console.log('✅ Primary company found:', primaryCompany.name);

      // Check if the final vendor number is available (unless it's already assigned to one of the merging companies)
      const companiesWithNumber = await Promise.all(
        companiesToMerge.map(async (id: string) => {
          try {
            return await storage.getCompanyById(id);
          } catch (error) {
            console.log('⚠️  Error getting company:', id, error);
            return null;
          }
        })
      );
      
      const hasExistingNumber = companiesWithNumber.some(c => c && c.companyNumber === finalVendorNumber);
      
      if (!hasExistingNumber) {
        const isAvailable = await storage.isVendorNumberAvailable(finalVendorNumber);
        if (!isAvailable) {
          console.log('❌ Vendor number already in use:', finalVendorNumber);
          return res.status(400).json({ message: 'Final vendor number is already assigned to another company' });
        }
      }

      console.log('✅ Vendor number validation passed');

      console.log('🔄 Starting merge operations...');

      // Start transaction-like operations
      // 1. Update all users from secondary companies to point to primary company
      const secondaryCompanies = companiesToMerge.filter((id: string) => id !== primaryCompanyId);
      
      console.log('📋 Secondary companies to merge:', secondaryCompanies);

      for (const secondaryCompanyId of secondaryCompanies) {
        console.log(`🔄 Processing secondary company: ${secondaryCompanyId}`);
        
        try {
          // Move all users to primary company
          const userResult = await db.update(users)
            .set({ companyId: primaryCompanyId })
            .where(eq(users.companyId, secondaryCompanyId));
          console.log(`✅ Moved users from ${secondaryCompanyId} to ${primaryCompanyId}`);

          console.log(`ℹ️  Supplier quotes and purchase orders are linked to companies through users, no direct move needed for ${secondaryCompanyId}`);
        } catch (error) {
          console.error(`❌ Error processing company ${secondaryCompanyId}:`, error);
          throw error;
        }
      }

      console.log('🔄 Updating primary company details...');

      // 2. Update primary company with final details
      try {
        await db.update(companies)
          .set({ 
            name: finalCompanyName.trim(),
            companyNumber: finalVendorNumber 
          })
          .where(eq(companies.id, primaryCompanyId));
        console.log(`✅ Updated primary company: ${finalCompanyName} (${finalVendorNumber})`);
      } catch (error) {
        console.error('❌ Error updating primary company:', error);
        throw error;
      }

      console.log('🔄 Deleting secondary companies...');

      // 3. Delete secondary companies
      for (const secondaryCompanyId of secondaryCompanies) {
        try {
          await db.delete(companies)
            .where(eq(companies.id, secondaryCompanyId));
          console.log(`✅ Deleted secondary company: ${secondaryCompanyId}`);
        } catch (error) {
          console.error(`❌ Error deleting company ${secondaryCompanyId}:`, error);
          throw error;
        }
      }

      console.log('🎉 Merge completed successfully!');

      res.json({ 
        success: true, 
        message: `Successfully merged ${companiesToMerge.length} companies`,
        primaryCompanyId,
        finalCompanyName,
        finalVendorNumber
      });
    } catch (error) {
      console.error('❌ Merge supplier companies error:', error);
      res.status(500).json({ message: `Failed to merge companies: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Test email endpoint
  app.post('/api/test/email', async (req, res) => {
    try {
      const { email, type, projectName } = req.body;
      
      if (type === 'quote-accepted') {
        await emailService.sendQuoteAcceptedNotification(
          email,
          'Test Supplier',
          {
            projectName: projectName || 'Test Project - Compressor Piston',
            quoteAmount: '2500.00',
            leadTime: 14
          }
        );
      } else if (type === 'quote-not-selected') {
        await emailService.sendQuoteNotSelectedNotification(
          email,
          'Test Supplier',
          {
            projectName: projectName || 'Test Project - Compressor Piston',
            quoteAmount: '2500.00',
            adminFeedback: 'Thank you for your submission. While your quote was competitive, we selected another supplier based on lead time requirements.'
          }
        );
      }
      
      res.json({ success: true, message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ success: false, message: 'Failed to send test email' });
    }
  });

  // Admin endpoint to manually trigger email notification check (for testing)
  app.post("/api/admin/trigger-email-notifications", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { messageNotificationService } = await import('./messageNotificationService');
      await messageNotificationService.triggerNotificationCheck();
      
      res.json({ message: "Email notification check triggered successfully" });
    } catch (error) {
      console.error("Trigger notification check error:", error);
      res.status(500).json({ error: "Failed to trigger notification check" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
