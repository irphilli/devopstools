package com.technojeeves.zipgrep.processors;

import com.technojeeves.io.IOUtils;

import com.technojeeves.zipgrep.logging.LoggingManager;

import java.io.File;

import java.util.Arrays;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;


public class CommandLineHelper {
    private static final String USAGE_PATH = "/resources/usage.txt";
    private static final String HELP_SHORT_OPTION = "-h";
    private static final String HELP_LONG_OPTION = "--help";
    private static final String DEBUG_OPTION = "-debug";
    private static final String LIST_OPTION = "-list";
    private static final String NO_RECURSE_OPTION = "-no-recurse";
    private String[] argv;
    private String helpString;
    private List<String> argsList;
    private Logger log = Logger.getLogger("");
    private LoggingManager loggingManager;
    private boolean doList;
    private boolean doDebug;
    private boolean doRecurse;
    private File startArchive;
    private String pattern;

    public CommandLineHelper(String[] argv) {
        // Recursion is true by default
        doRecurse = true;
        argsList = Arrays.asList(argv);
        loggingManager = new LoggingManager();
        loggingManager.init(log);
    }

    public File getStartArchive() {
        return this.startArchive;
    }

    public String getPattern() {
        return this.pattern;
    }

    public boolean getDoList() {
        return this.doList;
    }

    public boolean getDoDebug() {
        return this.doDebug;
    }

    public boolean getDoRecurse() {
        return this.doRecurse;
    }

    public void showHelp() {
        try {
            if (helpString == null) {
                helpString = IOUtils.inputStreamToString(getClass()
                                                             .getResourceAsStream(USAGE_PATH));
            }

            System.err.println(helpString);
        } catch (Exception e) {
            e.printStackTrace();
            log.log(Level.SEVERE, e.getMessage(), e);
        }
    }

    public void parse() {
        ProcessorManager processorManager = new ProcessorManager();
        processorManager.init();

        doList = argsList.contains(LIST_OPTION);
        doRecurse = !argsList.contains(NO_RECURSE_OPTION);
        doDebug = argsList.contains(DEBUG_OPTION);

        // Check for help request
        if (argsList.contains(HELP_SHORT_OPTION) ||
                argsList.contains(HELP_LONG_OPTION)) {
            showHelp();

            if (doDebug) {
                System.out.println("Current valid archive extensions are (case-insensitive):");
                System.out.println(processorManager.getValidArchiveExtensions());
                System.out.println("Current entry processors are:");
                System.out.println(processorManager.getEntryProcessors());
            }

            System.exit(1);
        }

        // If listing, we don't expect to find a pattern so the start archive is the last argument
        String fileArg = null;
        int len = argsList.size();

        if (doList) {
            fileArg = argsList.get(len - 1);
        } else {
            // We expect to have a pattern as well
            fileArg = argsList.get(len - 2);
            pattern = argsList.get(len - 1);
        }

        //TODO this could possibly made more efficient through the use of singleton/factory approach but it's not a biggie
        // Verify existence and validity of file
        startArchive = new File(fileArg);

        if (!(startArchive.exists() && startArchive.isFile() &&
                startArchive.canRead() &&
                processorManager.isValidArchiveExtension(fileArg))) {
            throw new RuntimeException(String.format(
                    "Something wrong in using %s as an archive file. Check it's a valid archive (extensions can be seen by running --help -debug) and is a readable file. Using a pattern is incompatible with -list, so the last argument must be a valid archive file.",
                    fileArg));
        }
    }
}
