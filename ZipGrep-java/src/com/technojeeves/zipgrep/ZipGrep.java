package com.technojeeves.zipgrep;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Handler;
import java.util.logging.Level;

//Can't use Log4j2 since it can't config dynamic level change
import java.util.logging.Logger;
import java.util.logging.SimpleFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import com.technojeeves.zipgrep.logging.LoggingManager;
import com.technojeeves.zipgrep.processors.CommandLineHelper;
import com.technojeeves.zipgrep.processors.ProcessorManager;

public class ZipGrep implements Runnable {
    private final static String DEFAULT_ARCHIVE_PATH_SEPARATOR = ":";
    private Logger log = Logger.getLogger("");
    private String archivePathSeparator;
    private ProcessorManager processorManager;
    private LoggingManager loggingManager;
    private File startArchive;
    private Pattern searchPattern;
    private boolean doList;
    private boolean doRecurse;
    private boolean doDebug;
    private CommandLineHelper commandLineHelper;
    private PrintWriter writer;
    private boolean hasInitBeenCalled;

    public ZipGrep() {}

    /**
     * We use this ctor if it's being used as a stand-alone app normally
     */
    public ZipGrep(String[] argv) {
        commandLineHelper = new CommandLineHelper(argv);
        commandLineHelper.parse();

        // patternAsString = commandLineHelper.getPattern();
        setSearchPattern(commandLineHelper.getPattern());

        // Set recursion if user requested it
        doRecurse = commandLineHelper.getDoRecurse();
        doList = commandLineHelper.getDoList();
        doDebug = commandLineHelper.getDoDebug();
        startArchive = commandLineHelper.getStartArchive();
        writer = new PrintWriter(System.out, true);
    }

    /**
     * Initialize dependent classes
     * init() MUST be called before run()
     */
    public void init() {
        try {
            if (archivePathSeparator == null) {
                archivePathSeparator = DEFAULT_ARCHIVE_PATH_SEPARATOR;
            }

            // This will handle processing logic
            processorManager = new ProcessorManager();
            loggingManager = new LoggingManager();

            // Set the log level if user requested it
            // Debugging MUST be set before init is called
            processorManager.setDoDebug(doDebug);
            processorManager.setWriter(this.writer);
            processorManager.init();

            // Initialize logging
            loggingManager.init(log);

            // We might not have a pattern, so
            if (doDebug) {
                log.fine(String.format("File given to app is %s", startArchive));

                if (doList) {
                    log.fine("Listing requested");
                }
            }
        } catch (Exception e) {
            log.log(Level.SEVERE, e.getMessage(), e);
        }

        hasInitBeenCalled = true;
    }

    /**
     * Method description
     *
     *
     * @param args
     *
     * @throws Exception
     */
    public static void main(String[] args) throws Exception {
        ZipGrep zn = new ZipGrep(args);

        zn.init();

        // Call run in same thread for now
        zn.run();
    }

    // pathPrefix holds the nested archive name on the stack, for visualization purposes

    /**
     * Internal main processing method. This should not normally be called directly.
     * It is actually called by the {@link #run() run} method, and that is the one
     * that should be used.
     *
     *
     * @param compressedInput
     * @param pathPrefix
     * @param name
     *
     * @throws IOException
     */
    protected void process(InputStream compressedInput, String pathPrefix, String name) throws IOException {
        ZipInputStream input = new ZipInputStream(compressedInput);
        ZipEntry entry = null;

        if (doDebug) {
            log.fine(String.format("Pattern to be used is %s", searchPattern));
        }

        while ((entry = input.getNextEntry()) != null) {
            if (doRecurse && processorManager.isValidArchiveExtension(entry.getName())) {
                String nestedName = name + "/" + entry.getName();

                if (doDebug) {

                    // log.fine(String.format("Recursing into %s%n", nestedName));
                    log.fine(String.format("Recursing into %s%n", name + archivePathSeparator + entry.getName()));
                }

                String archivesOnlyPath = pathPrefix + archivePathSeparator + entry.getName();

                process(input, archivesOnlyPath, nestedName);
            } else if ((searchPattern != null) &&!entry.isDirectory()) {

                // Process file entries, but only if a pattern has been found
                processorManager.processEntry(input, startArchive, pathPrefix, entry.getName(), searchPattern);
            }

            if (doList) {

                // Make sure entries that are simply nested archives get the separator that denotes nesting
                String entryToList = entry.getName();
                String sep = processorManager.isValidArchiveExtension(entryToList)
                             ? archivePathSeparator
                             : "/";

                writer.printf("%s%s%s%n", pathPrefix, sep, entryToList);
            }
        }
    }

    /**
     * The method that should be called after all necessary attributes have been set
     * and init() has been called
     */
    @Override
    public void run() {
        if (!hasInitBeenCalled) {
            throw new RuntimeException("init() must be called before running ZipGrep");
        }

        try (FileInputStream input = new FileInputStream(startArchive)) {
            String startArchiveName = startArchive.toString();

            process(input, startArchiveName, startArchive.toString());
        } catch (IOException e) {
            log.log(Level.SEVERE, e.getMessage(), e);
        }
    }

    /**
     *
     * @return The token used to separate nested archives
     */
    public String getArchivePathSeparator() {
        return this.archivePathSeparator;
    }

    /**
     * Set the token used to separate nested archives
     *
     *
     * @param archivePathSeparator
     */
    public void setArchivePathSeparator(String archivePathSeparator) {
        this.archivePathSeparator = archivePathSeparator;
    }

    /**
     *
     * @return Value showing whether we want to show debugging info
     */
    public boolean getDoDebug() {
        return this.doDebug;
    }

    /**
     * Method description
     *
     *
     * @param doDebug Value showing whether we want to show debugging info
     */
    public void setDoDebug(boolean doDebug) {
        this.doDebug = doDebug;
    }

    /**
     *
     * @return Value showing whether we merely want to list an archive
     */
    public boolean getDoList() {
        return this.doList;
    }

    /**
     *
     *
     * @param doList Value showing whether we merely want to list an archive
     */
    public void setDoList(boolean doList) {
        this.doList = doList;
    }

    /**
     *
     * @return Value showing whether we want to process nested archives recursively (default true)
     */
    public boolean getDoRecurse() {
        return this.doRecurse;
    }

    /**
     *
     *
     * @param doRecurse Value showing whether we want to process nested archives recursively (default true)
     */
    public void setDoRecurse(boolean doRecurse) {
        this.doRecurse = doRecurse;
    }

    /**
     *
     * @param searchPattern The Pattern we want to use for searching
     */
    public void setSearchPattern(Pattern searchPattern) {
        this.searchPattern = searchPattern;
    }

    /**
     * Sets the search pattern and (currently) mutates it
     * so that a Pattern.find is done
     *
     * @param searchPattern The Pattern we want to use for searching
     */
    public void setSearchPattern(String searchPattern) {
        if (searchPattern != null) {
            String temp = searchPattern;

            // TODO
            // Now make it so a find() rather than a matches() is done. We might call find itself later
            temp = String.format(".*%s.*", temp);
            this.searchPattern = Pattern.compile(temp);
        }
    }

    /**
     *
     * @return The root archive we are processing
     */
    public File getStartArchive() {
        return this.startArchive;
    }

    /**
     *
     * @param startArchive The root archive we are processing
     */
    public void setStartArchive(File startArchive) {
        this.startArchive = startArchive;
    }

    /**
     * We need to be able to decide where output is going to be printed
     * This needs to be propagated to other classes that need to produce output
     *
     * @param writer The Writer to which to send output
     */
    public void setWriter(PrintWriter writer) {
        this.writer = writer;
    }
}


//~ Formatted by Jindent --- http://www.jindent.com
