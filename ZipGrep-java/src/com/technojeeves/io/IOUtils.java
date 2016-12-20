package com.technojeeves.io;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.File;
import java.io.Reader;
import java.io.Writer;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;


/**
 * Various IO convenience routines
 *
 * @author Charles Johnson
 * @version 1.0
 */
public class IOUtils {
    // Various options for closing streams
    public static final int CLOSE_NEITHER = 1;
    public static final int CLOSE_INPUT = 2;
    public static final int CLOSE_OUTPUT = 4;
    public static final int CLOSE_BOTH = 6;

    public static final int DEFAULT_READ_BUFFER_SIZE = 1 << 10 << 3; // 8KiB

    /**
     * Copy stderr and stdout of a Process to the console
     *
     * @param p The Process' streams we want to print
     */
    public static void outputProcessStreams(final Process p) {
	Thread runStdout = new Thread() {
	    public void run() {
		IOUtils.copyStream(p.getInputStream(), System.out);
	    }
	};

	runStdout.start();

	Thread runStderr = new Thread() {
	    public void run() {
		IOUtils.copyStream(p.getErrorStream(), System.err);
	    }
	};

	runStderr.start();
    }

    /**
     * Collect stderr and stdout of a Process
     *
     * @param p The Process' streams we want to collect
     */
    public static void collectProcessStreams(final Process p,
	    final StringBuilder stderr, final StringBuilder stdout) {
	Thread runStdout = new Thread() {
	    public void run() {
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		IOUtils.copyStream(p.getInputStream(), out);
		stdout.append(new String(out.toByteArray()));
	    }
	};

	runStdout.start();

	Thread runStderr = new Thread() {
	    public void run() {
		ByteArrayOutputStream err = new ByteArrayOutputStream();
		IOUtils.copyStream(p.getErrorStream(), err);
		stderr.append(new String(err.toByteArray()));
	    }
	};

	runStderr.start();
    }

    /**
     * Copy a stream
     *
     * @param in The source stream
     * @param out The target stream
     */
    public static void copyStream(InputStream in, OutputStream out) {

	try {
	    byte[] buffer = new byte[DEFAULT_READ_BUFFER_SIZE];
	    int bytesRead = -1;

	    while ((bytesRead = in.read(buffer)) > -1) {
		out.write(buffer, 0, bytesRead);
	    }
	} catch (IOException e) {
	    e.printStackTrace();
	} finally {
	    try {
		in.close();
	    } catch (IOException e) {
		/* ignore */
	    }

	    try {
		out.close();
	    } catch (IOException e) {
		/* ignore */
	    }
	}
    }

    /**
     *
     * @param in The source stream
     * @param out The target stream
     * @param closeOptions Which stream(s) do we want to close? A bit mask
     */
    public static void copyStream(InputStream in, OutputStream out,
	    int closeOptions) {

	try {
	    byte[] buffer = new byte[DEFAULT_READ_BUFFER_SIZE];
	    int bytesRead = -1;

	    while ((bytesRead = in.read(buffer)) > -1) {
		out.write(buffer, 0, bytesRead);
	    }
	} catch (IOException e) {
	    e.printStackTrace();
	} finally {
	    // Ignore anything else if CLOSE_NEITHER is set
	    if ((closeOptions & IOUtils.CLOSE_NEITHER) < 1) {
		try {
		    if ((closeOptions & IOUtils.CLOSE_INPUT) > 0) {
			in.close();
		    }
		} catch (IOException e) {
		    /* ignore */
		}

		try {
		    if ((closeOptions & IOUtils.CLOSE_OUTPUT) > 0) {
			out.close();
		    }
		} catch (IOException e) {
		    /* ignore */
		}
	    }
	}
    }
    public static void copyReader(Reader in, Writer out) {
	try {
	    char[] buffer = new char[DEFAULT_READ_BUFFER_SIZE];
	    int charsRead = -1;
	    while ((charsRead = in.read(buffer)) > -1) {
		out.write(buffer, 0, charsRead);
	    }
	} catch (IOException e) {
	    e.printStackTrace();
	}

	finally {
	    try {
		in.close();
	    } catch (IOException e) {
		e.printStackTrace();
	    }
	    try {
		out.close();
	    } catch (IOException e) {
		e.printStackTrace();
	    }
	}

    }

    /**
     *  Description of the Method
     *
     * @param  in               The InputStream to turn into a byte array
     * @return                  The desired byte array
     * @exception  IOException  General IO exception
     */
    public static byte[] inputStreamToByteArray(InputStream in)
	throws IOException {
	byte[] result;
	ByteArrayOutputStream out = new ByteArrayOutputStream();
	IOUtils.copyStream(in, out, IOUtils.CLOSE_BOTH);
	result = out.toByteArray();
	return result;
    }

    /**
     *  Description of the Method
     *
     * @param  in               The InputStream to turn into a byte array
     * @return                  The desired String
     * @exception  IOException  General IO exception
     */
    public static String inputStreamToString(InputStream in)
	throws IOException {
	return new String(IOUtils.inputStreamToByteArray(in));
    }

    /**
     * Fill a byte array with the contents of a file
     *
     * @param fileName The file to use
     *
     * @return The resulting byte array
     */
    public static byte[] fileToByteArray(String fileName) {
	DataInputStream in = null;
	byte[] result = null;

	try {
	    File f = new File(fileName);
	    int fileSize = (int) f.length();
	    in = new DataInputStream(new FileInputStream(f));
	    result = new byte[fileSize];
	    in.readFully(result);
	} catch (IOException e) {
	    e.printStackTrace();
	} finally {
	    try {
		in.close();
	    } catch (Exception e) { /* ignore */
	    }
	}

	return result;
    }
    /**
     * Description of the Method
     *
     * @param file
     *          The file to be turned into a String
     * @return  The file as String encoded in the platform
     * default encoding
     */
    public static String fileToString(String file) {
	String result = null;
	DataInputStream in = null;

	try {
	    File f = new File(file);
	    byte[] buffer = new byte[(int) f.length()];
	    in = new DataInputStream(new FileInputStream(f));
	    in.readFully(buffer);
	    result = new String(buffer);
	} catch (IOException e) {
	    throw new RuntimeException("IO problem in fileToString", e);
	} finally {
	    try {
		in.close();
	    } catch (IOException e) { /* ignore it */
	    }
	}
	return result;
    }

}
