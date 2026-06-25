// app/actions/auth.ts
'use server';

import { prisma } from '@/app/lib/db';
import bcrypt from 'bcryptjs';

export async function handleDatabaseAuth(formData: any) {
  const { action, email, password, name, role } = formData;

  try {
    if (action === 'signup') {
      // 1. Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });

      if (existingUser) {
        return { success: false, error: 'This email is already registered.' };
      }

      // 2. Hash the password safely
      const hashedPassword = await bcrypt.hash(password, 10);

      // 3. Insert into Neon PostgreSQL database
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          name: name || 'Operator',
          role: 'operator'
        }
      });

      // Return user data (excluding password)
      return { 
        success: true, 
        user: { email: newUser.email, name: newUser.name, role: newUser.role } 
      };

    } else if (action === 'signin') {
      // 1. Find user in Postgres
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });

      if (!user) {
        return { success: false, error: 'Invalid email or password.' };
      }

      // 2. Compare incoming password with hashed password in database
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return { success: false, error: 'Invalid email or password.' };
      }

      return { 
        success: true, 
        user: { email: user.email, name: user.name, role: user.role } 
      };
    }

    return { success: false, error: 'Unknown action type.' };
  } catch (error: any) {
    console.error('Database Auth Error:', error);
    return { success: false, error: 'Database connection failed: ' + error.message };
  }
}